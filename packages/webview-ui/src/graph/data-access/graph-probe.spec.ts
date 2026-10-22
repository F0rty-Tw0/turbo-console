/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle -- the probe's window names are the e2e contract */

import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { createGraphProbe, exposeProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeEdge, ProbeFolder, ProbeHost, ProbeNode } from '../common/graph-probe.type.ts';
import { boxedCyMock, containerAtMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_COLORS, canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { folderLinkIdOf } from '../utils/folder-id.util.ts';

const GHOST_CLASSES = 'highlighted ghost';

const ELEMENTS: ElementDefinition[] = [
  canvasNodeOf('a'),
  canvasNodeOf('b'),
  canvasNodeOf('c'),
  canvasEdgeOf('a', 'b'),
  canvasEdgeOf('b', 'c'),
  canvasEdgeOf('a', 'c')
];

const nodeOf = (probe: GraphProbe, id: string): ProbeNode | undefined => {
  const isId = (node: ProbeNode): boolean => node.id === id;

  return probe.nodes().find(isId);
};

const edgeOf = (probe: GraphProbe, source: string, target: string): ProbeEdge | undefined => {
  const isEnds = (edge: ProbeEdge): boolean => edge.source === source && edge.target === target;

  return probe.edges().find(isEnds);
};

describe('FEATURE: exposeProbe', () => {
  it.each([
    ['no flag', {}],
    ["the string 'true'", { __tcGraphProbeWanted: 'true' }],
    ['the number 1', { __tcGraphProbeWanted: 1 }]
  ])('GIVEN %s WHEN the probe is offered THEN none is exposed', (_name, host: ProbeHost) => {
    exposeProbe(host, GRAPH_PROBE_STUB);

    expect(host.__tcGraphProbe).toBeUndefined();
  });

  it('GIVEN the flag true WHEN the probe is offered THEN the host holds that probe', () => {
    const host: ProbeHost = { __tcGraphProbeWanted: true };

    exposeProbe(host, GRAPH_PROBE_STUB);

    const exposed: GraphProbe | undefined = host.__tcGraphProbe;

    expect(exposed).toBe(GRAPH_PROBE_STUB);
  });
});

describe('FEATURE: createGraphProbe ghost facts', () => {
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
    cy.getElementById('b').addClass(GHOST_CLASSES);
    cy.getElementById('b').connectedEdges().addClass(GHOST_CLASSES);

    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    probe = createGraphProbe(view, GRAPH_PROBE_STUB);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN b drawn as a ghost on the path a, b, c', () => {
    it('WHEN the nodes are read THEN b is a highlighted ghost with a dashed border', () => {
      const node = nodeOf(probe, 'b');

      expect(node).toMatchObject({ isGhost: true, state: 'highlighted', borderStyle: 'dashed' });
    });

    it('WHEN the nodes are read THEN a is no ghost and has a solid border', () => {
      const node = nodeOf(probe, 'a');

      expect(node).toMatchObject({ isGhost: false, borderStyle: 'solid' });
    });

    it('WHEN the edges are read THEN a to b is a drawn dashed ghost', () => {
      const edge = edgeOf(probe, 'a', 'b');

      expect(edge).toMatchObject({ isGhost: true, isDrawn: true, lineStyle: 'dashed' });
    });

    it('WHEN the edges are read THEN a to c is a drawn solid link', () => {
      const edge = edgeOf(probe, 'a', 'c');

      expect(edge).toMatchObject({ isGhost: false, isDrawn: true, lineStyle: 'solid' });
    });

    it('WHEN b gets a display none bypass THEN a to b is not drawn', () => {
      cy.getElementById('b').style('display', 'none');

      const edge = edgeOf(probe, 'a', 'b');

      expect(edge).toMatchObject({ isDrawn: false });
    });

    it('WHEN the visible ids are read THEN the ghost is left out', () => {
      const ids = probe.visibleIds();

      expect(ids).toStrictEqual(['a', 'c']);
    });
  });
});

describe('FEATURE: createGraphProbe folder facts', () => {
  const OPTIONS = { includeLabels: false, includeOverlays: false };
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = boxedCyMock();

    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    probe = createGraphProbe(view, GRAPH_PROBE_STUB);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cy.destroy();
  });

  describe('GIVEN no boxes', () => {
    it('WHEN the folders are read THEN there are none', () => {
      expect(probe.folders()).toStrictEqual([]);
    });
  });

  describe('GIVEN three boxes around the packages', () => {
    beforeEach(() => {
      setBoxes(cy, BOX_GROUPS_STUB);
      cy.getElementById('c').addClass('dimmed');
    });

    it('WHEN the nodes are read THEN they are the five packages, no box', () => {
      const ids = probe.nodes().map((node: ProbeNode): string => node.id);

      expect(ids.sort()).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
    });

    it('WHEN the visible ids are read THEN they are the five packages sorted', () => {
      expect(probe.visibleIds()).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
    });

    it('WHEN the edges are read THEN both links remain', () => {
      expect(probe.edges()).toHaveLength(2);
    });

    it('WHEN a folder link is drawn THEN the edges are still the two package links', () => {
      const data = { id: folderLinkIdOf('a', 'c'), source: 'a', target: 'c' };

      cy.add({ data, classes: 'folder-link' });

      expect(probe.edges().map((edge: ProbeEdge): string => `${edge.source}>${edge.target}`)).toStrictEqual(['a>b', 'b>c']);
    });

    it('WHEN the opacity is read THEN a normal package is 1 and a dimmed one 0.25 inside its unclassed box', () => {
      expect(nodeOf(probe, 'a')?.effectiveOpacity).toBe(1);
      expect(nodeOf(probe, 'c')?.effectiveOpacity).toBe(0.25);
    });

    it('WHEN the folders are read THEN they run root first, then apps, then packages, all normal and expanded', () => {
      const folders = probe.folders();

      expect(folders.map((folder: ProbeFolder): string => folder.folder)).toStrictEqual(['', 'apps', 'packages']);
      expect(folders.map((folder: ProbeFolder): string[] => folder.packages)).toStrictEqual([['d'], ['a', 'b'], ['c']]);

      for (const folder of folders) {
        expect(folder).toMatchObject({ isCollapsed: false, isVisible: true, state: 'normal' });
        expect(folder.renderedWidth).toBeGreaterThan(0);
        expect(folder.renderedHeight).toBeGreaterThan(0);
      }
    });

    it('WHEN b is hidden THEN the apps box still lists a and b', () => {
      cy.getElementById('b').style('display', 'none');

      const apps = probe.folders().find((folder: ProbeFolder): boolean => folder.folder === 'apps');

      expect(apps?.packages).toStrictEqual(['a', 'b']);
    });

    it('WHEN the container sits at 40, 70 THEN each box rect is its rendered box shifted by that origin', () => {
      vi.spyOn(cy, 'container').mockReturnValue(containerAtMock(40, 70));

      for (const folder of probe.folders()) {
        const { x1, x2, y1, y2 } = cy.getElementById(`\u0001${folder.folder}`).renderedBoundingBox(OPTIONS);

        expect(folder.renderedX).toBe(40 + (x1 + x2) / 2);
        expect(folder.renderedY).toBe(70 + (y1 + y2) / 2);
        expect(folder.renderedWidth).toBe(x2 - x1);
        expect(folder.renderedHeight).toBe(y2 - y1);
      }
    });
  });
});
