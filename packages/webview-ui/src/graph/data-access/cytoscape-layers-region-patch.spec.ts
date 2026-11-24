import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { canvasRendererOf, objectOf } from '../test/utils/canvas-renderer.spec.util.ts';

/** 1,600,000 px apart: 100,000 px at level -4, past the 32,767 px a layer may span at any level. */
const FAR_X = 1_600_000;

/** 300,000 px apart: 18,750 px at level -4, so one layer over the whole graph fits there. */
const FITTING_X = 300_000;

/** Inside the level -4 region around the 800 x 600 viewport at zoom 1 (x -800 to 1600), but not contiguous in z-order. */
const NEAR_X = 100;

/** Outside that region. */
const OUTSIDE_X = 5000;

const REGION_LEVEL = -4;

/** The canvas limit on a layer's width or height. */
const MAX_LAYER_DIM = 32_767;

/** At most this many dequeues drain a spec graph; more means the queue never empties. */
const MAX_DEQUEUES = 1000;

/** Below the graph's row, inside the level -4 frame (y -600 to 1200). */
const BELOW_Y = 500;

/** Asked for after level -4: four levels in all, one more than the 3 the patch keeps regions for. */
const LATER_LEVELS = [-3, -2, -1];

/** Past cytoscape's 3.99 layer zoom limit, where getLayers returns before it looks at any level. */
const PAST_MAX_ZOOM = 4;

/** Zoom 0.05 asks for level -4, as the task graph does at Fit. */
const FIT_ZOOM = 0.05;

const callOf = (target: object, name: string, args: unknown[]): unknown => {
  const method: unknown = Reflect.get(target, name);

  if (typeof method !== 'function') throw new Error(`spec: no ${name}`);

  return Reflect.apply(method, target, args);
};

const cacheOf = (renderer: object): object => {
  const data = objectOf(Reflect.get(renderer, 'data'), 'renderer data');

  return objectOf(Reflect.get(data, 'lyrTxrCache'), 'layered texture cache');
};

/** The renderer's z-sorted elements: the one array a frame hands getLayers until the graph changes. */
const zSortedOf = (renderer: object): unknown => callOf(renderer, 'getCachedZSortedEles', []);

const idOf = (ele: unknown): unknown => callOf(objectOf(ele, 'element'), 'id', []);

const idsOf = (eles: unknown): unknown[] => {
  if (!Array.isArray(eles)) throw new Error('spec: no element list');
  const ids = eles.map(idOf);

  return ids;
};

const layersOf = (layers: unknown): object[] | null => {
  if (!Array.isArray(layers)) return null;
  const objects = layers.map((layer: unknown): object => objectOf(layer, 'layer'));

  return objects;
};

const getLayersAt = (renderer: object, level: number): object[] | null => {
  const layers = callOf(cacheOf(renderer), 'getLayers', [zSortedOf(renderer), 1, level]);

  return layersOf(layers);
};

/** The levels that hold a region, in the order they were made. */
const regionLevelsOf = (renderer: object): string[] => {
  const regions = objectOf(Reflect.get(cacheOf(renderer), 'regions'), 'regions');
  const levels = Object.keys(regions);

  return levels;
};

/** The layers `level` keeps, without asking getLayers for them. */
const keptLayersAt = (renderer: object, level: number): object[] | null => {
  const layersByLevel = objectOf(Reflect.get(cacheOf(renderer), 'layersByLevel'), 'layers by level');
  const layers = layersOf(Reflect.get(layersByLevel, level));

  return layers;
};

/** Draws every queued element into its layer, as the idle frames after a gesture do. */
const drain = (renderer: object): void => {
  const cache = cacheOf(renderer);
  const queue = objectOf(Reflect.get(cache, 'layersQueue'), 'layers queue');

  for (let i = 0; callOf(queue, 'size', []) !== 0; i++) {
    if (i === MAX_DEQUEUES) throw new Error('spec: the layers queue never drained');
    callOf(cache, 'dequeue', [1]);
  }
};

/** The layers `level` hands out once its queued elements are drawn; `null` when it hands out none. */
const paintedAt = (renderer: object, level: number): object[] | null => {
  getLayersAt(renderer, level);
  drain(renderer);
  const layers = getLayersAt(renderer, level);

  return layers;
};

/** The ids each layer holds, layer by layer. */
const layerIdsOf = (layers: object[] | null): unknown[][] | null => {
  const ids = layers?.map((layer) => idsOf(Reflect.get(layer, 'eles'))) ?? null;

  return ids;
};

/** The ids of the elements drawLayeredElements draws one by one when getLayers hands out no layers. */
const directlyDrawnIdsOf = (renderer: object): unknown[][] => {
  const drawn: unknown[][] = [];
  const record = (_context: unknown, eles: unknown): void => {
    drawn.push(idsOf(eles));
  };
  const context = { drawImage: record };

  Reflect.set(renderer, 'drawCachedElements', record);
  callOf(renderer, 'drawLayeredElements', [context, zSortedOf(renderer), 1, null]);

  return drawn;
};

describe('FEATURE: the cytoscape layered texture cache region patch', () => {
  let cy: Core;
  let renderer: object;

  /** Nodes at `xById` on y 0, plus `edges`; set after creation, as definition positions came out at 0 in this rig. */
  const mount = (xById: Record<string, number>, edges: ElementDefinition[] = []): void => {
    const nodes = Object.keys(xById).map(canvasNodeOf);

    cy = cytoscape({ headless: true, styleEnabled: true, elements: [...nodes, ...edges] });

    for (const [id, x] of Object.entries(xById)) cy.$id(id).position({ x, y: 0 });
    renderer = canvasRendererOf(cy);
  };

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a graph too wide for one layer at level -4, with near2 after far in z-order', () => {
    beforeEach(() => {
      mount({ near: 0, far: FAR_X, near2: NEAR_X });
    });

    it('WHEN level -4 is painted THEN one layer holds the nodes around the viewport', () => {
      // Without the patch no layer fits, so every frame drew each in-view element one by one.
      expect(layerIdsOf(paintedAt(renderer, REGION_LEVEL))).toStrictEqual([['near', 'near2']]);
    });

    it('WHEN level -4 is painted THEN its layer fits the canvas limit', () => {
      const [layer] = paintedAt(renderer, REGION_LEVEL) ?? [];

      expect(Reflect.get(objectOf(layer, 'layer'), 'width')).toBeLessThanOrEqual(MAX_LAYER_DIM);
    });

    it('WHEN the viewport pans onto far THEN the layer is rebuilt around far', () => {
      paintedAt(renderer, REGION_LEVEL);
      cy.pan({ x: -FAR_X, y: 0 });

      expect(layerIdsOf(paintedAt(renderer, REGION_LEVEL))).toStrictEqual([['far']]);
    });

    it('WHEN the viewport pans onto far THEN dropping the old region keeps layers from skipping', () => {
      paintedAt(renderer, REGION_LEVEL);
      const invalidatedAt: unknown = Reflect.get(cacheOf(renderer), 'lastInvalidationTime');

      cy.pan({ x: -FAR_X, y: 0 });
      getLayersAt(renderer, REGION_LEVEL);

      // An invalidation time skips every level for 250 ms, which stalled the rebuild on each pan.
      expect(Reflect.get(cacheOf(renderer), 'lastInvalidationTime')).toBe(invalidatedAt);
    });

    it('WHEN level -4 is complete and a zoom asks for level -2 THEN it gets the level -4 layer', () => {
      paintedAt(renderer, REGION_LEVEL);
      const levels = getLayersAt(renderer, -2)?.map((layer): unknown => Reflect.get(layer, 'level'));

      expect(levels).toStrictEqual([REGION_LEVEL]);
    });

    it('WHEN four levels are asked for in turn THEN only the three latest keep a region', () => {
      getLayersAt(renderer, REGION_LEVEL);

      for (const level of LATER_LEVELS) getLayersAt(renderer, level);

      expect(regionLevelsOf(renderer)).toStrictEqual(LATER_LEVELS.map(String));
    });

    it('WHEN four levels are asked for in turn THEN the oldest level drops its layers', () => {
      paintedAt(renderer, REGION_LEVEL);

      for (const level of LATER_LEVELS) getLayersAt(renderer, level);

      // Each region level holds a layer up to 4000 x 4000 px; an uncapped list grows one per zoom level visited.
      expect(layerIdsOf(keptLayersAt(renderer, REGION_LEVEL))).toStrictEqual([]);
    });

    it('WHEN near2 moves down inside the frame THEN the region layer is rebuilt to reach it', () => {
      paintedAt(renderer, REGION_LEVEL);
      const near2 = cy.$id('near2');

      near2.position({ x: NEAR_X, y: BELOW_Y });
      callOf(cacheOf(renderer), 'invalidateElements', [near2]);
      const [layer] = paintedAt(renderer, REGION_LEVEL) ?? [];
      const bb = objectOf(Reflect.get(objectOf(layer, 'layer'), 'bb'), 'layer box');

      // The old region box clipped the graph's row, so near2 would be drawn outside its layer and cut off.
      expect(Reflect.get(bb, 'y2')).toBe(near2.boundingBox().y2);
    });

    it('WHEN far moves close enough for the whole graph to fit THEN one layer over the whole graph replaces the region', () => {
      paintedAt(renderer, REGION_LEVEL);
      const far = cy.$id('far');

      far.position({ x: FITTING_X, y: 0 });
      callOf(cacheOf(renderer), 'invalidateElements', [far]);

      expect(layerIdsOf(paintedAt(renderer, REGION_LEVEL))).toStrictEqual([['near', 'far', 'near2']]);
    });

    it('WHEN a frame past the max layer zoom follows a region frame THEN every element is drawn', () => {
      getLayersAt(renderer, REGION_LEVEL);
      cy.zoom(PAST_MAX_ZOOM);

      // The region list of the earlier frame would drop far from a frame that draws all elements.
      expect(directlyDrawnIdsOf(renderer)).toStrictEqual([['near', 'far', 'near2']]);
    });

    it('WHEN getLayers is stubbed to hand out no layers after a region frame THEN every element is drawn', () => {
      getLayersAt(renderer, REGION_LEVEL);
      Reflect.set(cacheOf(renderer), 'getLayers', (): null => null);

      // The pixel e2e probe stubs getLayers so (drawWithoutLayers); a stale region list would blank part of its frames.
      expect(directlyDrawnIdsOf(renderer)).toStrictEqual([['near', 'far', 'near2']]);
    });

    it('WHEN a Fit frame has no region layer yet THEN only the region elements are drawn one by one', () => {
      cy.zoom(FIT_ZOOM);

      expect(directlyDrawnIdsOf(renderer)).toStrictEqual([['near', 'near2']]);
    });
  });

  describe('GIVEN a node outside the level -4 region', () => {
    beforeEach(() => {
      mount({ near: 0, far: FAR_X, mid: OUTSIDE_X });
    });

    it('WHEN it moves into the region THEN the region layer holds it', () => {
      paintedAt(renderer, REGION_LEVEL);
      const mid = cy.$id('mid');

      mid.position({ x: NEAR_X, y: 0 });
      callOf(cacheOf(renderer), 'invalidateElements', [mid]);

      expect(layerIdsOf(paintedAt(renderer, REGION_LEVEL))).toStrictEqual([['near', 'mid']]);
    });
  });

  describe('GIVEN two edges to far, straddling the level -4 region edge', () => {
    const nearEdge = canvasEdgeOf('near', 'far');
    const near2Edge = canvasEdgeOf('near2', 'far');

    beforeEach(() => {
      mount({ near: 0, far: FAR_X, near2: NEAR_X }, [nearEdge, near2Edge]);
    });

    it('WHEN level -4 is painted THEN one layer holds both edges and the nodes in the region', () => {
      const layerIds = [[nearEdge.data.id, near2Edge.data.id, 'near', 'near2']];

      // Each element reaching past a layer's box used to start another layer, one more canvas per straddling edge.
      expect(layerIdsOf(paintedAt(renderer, REGION_LEVEL))).toStrictEqual(layerIds);
    });
  });

  describe('GIVEN a graph whose whole layer fits at level -4, reaching far past the viewport', () => {
    beforeEach(() => {
      mount({ near: 0, far: FITTING_X });
    });

    it('WHEN level -4 is first asked for THEN one layer over the whole graph is drawn at once, as before the patch', () => {
      // Region mode would queue a layer over near only; graphs that fit keep the old path byte for byte.
      expect(layerIdsOf(getLayersAt(renderer, REGION_LEVEL))).toStrictEqual([['near', 'far']]);
    });
  });
});
