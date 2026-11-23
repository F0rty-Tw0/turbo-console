import cytoscape from 'cytoscape';
import type { BoundingBox12, CollectionReturnValue, Core, Css, ElementDefinition, StylesheetJson } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { isStyleDirty, recordFirstArgs, spyOnOwn } from '../test/utils/cytoscape-internals.spec.util.ts';

type GraphState = {
  readonly childVisible: boolean;
  readonly edgeVisible: boolean;
  readonly parentBox: BoundingBox12;
};

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

const CHILD_EDGE = canvasEdgeOf('a', 'c');

const CHILD_EDGE_ID = CHILD_EDGE.data.id ?? '';

const FIRST_EDGE = canvasEdgeOf('a', 'b');

const FIRST_EDGE_ID = FIRST_EDGE.data.id ?? '';

const CHILD_DATA = { id: 'a', parent: 'p' };

const PARALLEL_DATA = { id: 'a-b-2', source: 'a', target: 'b' };

/** A styled headless graph: compound `p` holds `a`, which links to `c`. */
const compoundGraphOf = (childClasses: string): Core => {
  const parent = canvasNodeOf('p');
  const child: ElementDefinition = { data: CHILD_DATA, classes: childClasses };
  const elements = [parent, child, canvasNodeOf('c'), CHILD_EDGE];

  return cytoscape({ headless: true, styleEnabled: true, style: STYLE, elements });
};

/** What the trigger effects decide: visibility of the child and its edge, and the compound's bounds. */
const graphStateOf = (cy: Core): GraphState => {
  const child = cy.$id('a');
  const edge = cy.$id(CHILD_EDGE_ID);
  const parent = cy.$id('p');
  const childVisible = child.visible();
  const edgeVisible = edge.visible();
  const parentBox = parent.boundingBox();
  const state: GraphState = { childVisible, edgeVisible, parentBox };

  return state;
};

describe('FEATURE: the cytoscape style triggers patch', () => {
  let cy: Core;
  let child: CollectionReturnValue;
  let fresh: Core | undefined;

  afterEach(() => {
    cy.destroy();
    fresh?.destroy();
    fresh = undefined;
  });

  describe('GIVEN a styled child of a compound whose style was never applied', () => {
    beforeEach(() => {
      cy = compoundGraphOf('');
      child = cy.$id('a');
    });

    it('WHEN nothing has read its style THEN Cytoscape still owes it the first apply', () => {
      const dirty = isStyleDirty(child);

      expect(dirty).toBe(true);
    });

    describe('WHEN its width is read', () => {
      it('THEN its style cache is dirtied once for the whole apply', () => {
        const dirtyStyleCache = spyOnOwn(child, 'dirtyStyleCache');

        child.style('width');

        expect(dirtyStyleCache).toHaveBeenCalledTimes(1);
      });

      it('THEN the renderer is told its z-order changed', () => {
        const notices = recordFirstArgs(cy, 'notify');

        child.style('width');

        expect(notices).toContain('zorder');
      });
    });
  });

  describe('GIVEN a bezier edge a to b whose style was applied', () => {
    it('WHEN a parallel edge a to b is added and styled THEN the first edge bounds are dirtied', () => {
      const elements = [canvasNodeOf('a'), canvasNodeOf('b'), FIRST_EDGE];

      cy = cytoscape({ headless: true, styleEnabled: true, style: STYLE, elements });
      const first = cy.$id(FIRST_EDGE_ID);

      first.style('curve-style');
      const added = cy.add({ data: PARALLEL_DATA });
      const dirtyBoundingBoxCache = spyOnOwn(first, 'dirtyBoundingBoxCache');

      added.style('display');

      expect(dirtyBoundingBoxCache).toHaveBeenCalled();
    });
  });

  describe('GIVEN a hidden child of a compound with an edge, all styles applied', () => {
    let hidden: GraphState;

    beforeEach(() => {
      cy = compoundGraphOf('hidden');
      child = cy.$id('a');
      hidden = graphStateOf(cy);
    });

    it('WHEN nothing changes THEN the child reads hidden', () => {
      const childVisible = hidden.childVisible;

      expect(childVisible).toBe(false);
    });

    it('WHEN the child is shown and its display read THEN its edge bounds are dirtied', () => {
      const edge = cy.$id(CHILD_EDGE_ID);
      const dirtyBoundingBoxCache = spyOnOwn(edge, 'dirtyBoundingBoxCache');

      child.removeClass('hidden');

      child.style('display');

      expect(dirtyBoundingBoxCache).toHaveBeenCalled();
    });

    it('WHEN the child is shown THEN visibility and compound bounds match a graph built shown', () => {
      fresh = compoundGraphOf('');
      const built = graphStateOf(fresh);

      child.removeClass('hidden');

      const shown = graphStateOf(cy);

      expect(shown).toStrictEqual(built);
    });
  });
});
