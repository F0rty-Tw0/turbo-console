import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { beforeEach, describe, expect, it } from 'vitest';

import { anchorBoxOf, panBy } from './graph-camera.ts';
import { showOnly } from './graph-visibility.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';

const nodeAt = (id: string, x: number, y: number): ElementDefinition => {
  const data = { id };
  const position: Position = { x, y };
  const definition: ElementDefinition = { data, position };

  return definition;
};

const ELEMENTS: ElementDefinition[] = [nodeAt('a', 100, 50), nodeAt('b', 300, 50), nodeAt('c', 500, 50), nodeAt('__proto__', 700, 50)];

const NODE_STYLE = { width: 40, height: 20, 'border-width': 0 };

const STYLE = [{ selector: 'node', style: NODE_STYLE }];

const LAYOUT = { name: 'preset' };

/** Cytoscape pads each node box by 1 model px a side (bounds.mjs `expandBoundingBox(bbBody, 1)`), so a is (100 +- 21) * 2 + 10. */
const BOX_A: AnchorBox = { x1: 168, x2: 252 };

const buildCy = (): Core => {
  const cy = cytoscape({ headless: true, styleEnabled: true, layout: LAYOUT, elements: ELEMENTS, style: STYLE });

  cy.zoom(2);
  cy.pan({ x: 10, y: 5 });

  return cy;
};

describe('FEATURE: graph camera', () => {
  let cy: Core;

  beforeEach(() => {
    cy = buildCy();
  });

  describe('GIVEN a zoomed and panned graph', () => {
    it('WHEN one node is named THEN its rendered span is returned', () => {
      const box = anchorBoxOf(cy, ['a']);

      expect(box).toStrictEqual(BOX_A);
    });

    it('WHEN two nodes are named THEN the box spans both', () => {
      const box = anchorBoxOf(cy, ['a', 'b']);

      expect(box).toStrictEqual({ x1: 168, x2: 652 });
    });

    it('WHEN an unknown name is named with a node THEN the box is the node box', () => {
      const box = anchorBoxOf(cy, ['a', 'ghost']);

      expect(box).toStrictEqual(BOX_A);
    });

    it('WHEN only an unknown name is named THEN there is no box', () => {
      const box = anchorBoxOf(cy, ['ghost']);

      expect(box).toBeNull();
    });

    it('WHEN no name is given THEN there is no box', () => {
      const box = anchorBoxOf(cy, []);

      expect(box).toBeNull();
    });

    it('WHEN the name is __proto__ THEN its span is returned', () => {
      const box = anchorBoxOf(cy, ['__proto__']);

      expect(box).toStrictEqual({ x1: 1368, x2: 1452 });
    });

    it('WHEN the graph is panned by -30 THEN x moves, y and zoom stay', () => {
      panBy(cy, -30);

      expect(cy.pan()).toStrictEqual({ x: -20, y: 5 });
      expect(cy.zoom()).toBe(2);
    });

    it('WHEN the graph is panned by 0 THEN the pan is unchanged', () => {
      panBy(cy, 0);

      expect(cy.pan()).toStrictEqual({ x: 10, y: 5 });
    });
  });

  describe('GIVEN node b is hidden', () => {
    beforeEach(() => {
      showOnly(cy, new Set(['a', 'c', '__proto__']));
    });

    it('WHEN a and b are named THEN the box is the box of a', () => {
      const box = anchorBoxOf(cy, ['a', 'b']);

      expect(box).toStrictEqual(BOX_A);
    });

    it('WHEN only b is named THEN there is no box', () => {
      const box = anchorBoxOf(cy, ['b']);

      expect(box).toBeNull();
    });
  });
});
