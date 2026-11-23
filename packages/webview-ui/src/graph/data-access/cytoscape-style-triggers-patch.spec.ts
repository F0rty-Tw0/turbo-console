import cytoscape from 'cytoscape';
import type { BoundingBox12, Core, Css, ElementDefinition, StylesheetJson } from 'cytoscape';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

type GraphState = {
  readonly childVisible: boolean;
  readonly edgeVisible: boolean;
  readonly parentBox: BoundingBox12;
};

type Method = (...args: unknown[]) => unknown;

const NODE_STYLE: Css.Node = {
  width: 30,
  height: 20,
  label: 'data(id)',
  'font-size': 12,
  'border-width': 2,
  shape: 'round-rectangle',
  padding: '4px'
};

const EDGE_STYLE: Css.Edge = { 'curve-style': 'bezier' };

const HIDDEN_STYLE: Css.Node = { display: 'none' };

const NODE_RULE = { selector: 'node', style: NODE_STYLE };

const EDGE_RULE = { selector: 'edge', style: EDGE_STYLE };

const HIDDEN_RULE = { selector: '.hidden', style: HIDDEN_STYLE };

const STYLE: StylesheetJson = [NODE_RULE, EDGE_RULE, HIDDEN_RULE];

const EDGE_ID = canvasEdgeOf('a', 'c').data.id ?? '';

const FIRST_EDGE = canvasEdgeOf('a', 'b');

const FIRST_EDGE_ID = FIRST_EDGE.data.id ?? '';

const CHILD_DATA = { id: 'a', parent: 'p' };

const PARALLEL_DATA = { id: 'a-b-2', source: 'a', target: 'b' };

/** Replaces `method` on `target` with a mock that records each call, then calls through. */
const spyOnOwn = (target: object, method: string): Mock<Method> => {
  const original: unknown = Reflect.get(target, method);

  if (typeof original !== 'function') throw new Error(`spec: no ${method} to spy on`);
  const spy = vi.fn(function (this: unknown, ...args: unknown[]): unknown {
    return Reflect.apply(original, this, args);
  });

  Reflect.set(target, method, spy);

  return spy;
};

/** Whether Cytoscape still owes `target` a style apply. */
const isStyleDirty = (target: object): boolean => {
  const internals: unknown = Reflect.get(target, '_private');

  if (typeof internals !== 'object' || internals === null) throw new Error('spec: no internals on the element');

  return Reflect.get(internals, 'styleDirty') === true;
};

/** A styled headless graph: compound `p` holds `a`, which links to `c`. */
const compoundGraphOf = (childClasses: string): Core => {
  const parent = canvasNodeOf('p');
  const child: ElementDefinition = { data: CHILD_DATA, classes: childClasses };
  const elements = [parent, child, canvasNodeOf('c'), canvasEdgeOf('a', 'c')];

  return cytoscape({ headless: true, styleEnabled: true, style: STYLE, elements });
};

/** What the trigger effects decide: visibility of the child and its edge, and the compound's bounds. */
const graphStateOf = (cy: Core): GraphState => {
  const childVisible = cy.$id('a').visible();
  const edgeVisible = cy.$id(EDGE_ID).visible();
  const parentBox = cy.$id('p').boundingBox();
  const state: GraphState = { childVisible, edgeVisible, parentBox };

  return state;
};

describe('FEATURE: the cytoscape style triggers patch', () => {
  let cy: Core;
  let fresh: Core | undefined;

  afterEach(() => {
    cy.destroy();
    fresh?.destroy();
    fresh = undefined;
  });

  describe('GIVEN a styled child of a compound whose style was never applied', () => {
    it('WHEN nothing has read its style THEN Cytoscape still owes it the first apply', () => {
      cy = compoundGraphOf('');

      expect(isStyleDirty(cy.$id('a'))).toBe(true);
    });

    it('WHEN its width is read THEN its style cache is dirtied once for the whole apply', () => {
      cy = compoundGraphOf('');
      const child = cy.$id('a');
      const dirtyStyleCache = spyOnOwn(child, 'dirtyStyleCache');

      child.style('width');

      expect(dirtyStyleCache).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN a bezier edge a to b whose style was applied', () => {
    it('WHEN a parallel edge a to b is added and styled THEN the first edge bounds are dirtied', () => {
      const elements = [canvasNodeOf('a'), canvasNodeOf('b'), FIRST_EDGE];

      cy = cytoscape({ headless: true, styleEnabled: true, style: STYLE, elements });
      const first = cy.$id(FIRST_EDGE_ID);

      first.style('curve-style');
      const dirtyBoundingBoxCache = spyOnOwn(first, 'dirtyBoundingBoxCache');
      const added = cy.add({ data: PARALLEL_DATA });

      dirtyBoundingBoxCache.mockClear();
      added.style('display');

      expect(dirtyBoundingBoxCache).toHaveBeenCalled();
    });
  });

  describe('GIVEN a hidden child of a compound with an edge, all styles applied', () => {
    it('WHEN the child is shown THEN visibility and compound bounds match a graph built shown', () => {
      cy = compoundGraphOf('hidden');
      graphStateOf(cy);
      cy.$id('a').removeClass('hidden');
      fresh = compoundGraphOf('');

      expect(graphStateOf(cy)).toStrictEqual(graphStateOf(fresh));
    });
  });
});
