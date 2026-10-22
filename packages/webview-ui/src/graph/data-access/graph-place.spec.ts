import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { placeNodes, positionOf } from './graph-place.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';

const A_AT: Position = { x: 10, y: 20 };

const B_AT: Position = { x: 30, y: 40 };

const C_AT: Position = { x: 50, y: 60 };

const D_AT: Position = { x: 70, y: 80 };

const ORIGIN: Position = { x: 0, y: 0 };

const PLACED: Positions = { a: A_AT, b: B_AT, c: C_AT, d: D_AT };

const PLACED_IDS = ['a', 'b', 'c', 'd'];

const BOXED_IDS = ['a', 'b'];

const BOX_AT: Position = { x: 900, y: 900 };

describe('FEATURE: placeNodes', () => {
  let cy: Core;

  beforeEach(() => {
    cy = boxedCyMock();
    setBoxes(cy, BOX_GROUPS_STUB);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN boxes and positions for four packages', () => {
    it('WHEN they are placed THEN the packages sit at their positions', () => {
      placeNodes(cy, PLACED);

      const centres = PLACED_IDS.map((id: string): Position => cy.getElementById(id).position());

      expect(centres).toStrictEqual([A_AT, B_AT, C_AT, D_AT]);
    });

    it('WHEN they are placed THEN the package named __proto__, unplaced, goes to the origin', () => {
      placeNodes(cy, PLACED);

      expect(cy.getElementById('__proto__').position()).toStrictEqual(ORIGIN);
    });

    it('WHEN a position is offered under a box id THEN the packages still sit at their positions', () => {
      placeNodes(cy, { ...PLACED, '\u0001apps': BOX_AT });

      const centres = BOXED_IDS.map((id: string): Position => cy.getElementById(id).position());

      expect(centres).toStrictEqual([A_AT, B_AT]);
    });
  });
});

describe('FEATURE: positionOf', () => {
  describe('GIVEN positions without an own constructor key', () => {
    it('WHEN constructor is read THEN the origin returns, not an inherited member', () => {
      expect(positionOf(PLACED, 'constructor')).toStrictEqual(ORIGIN);
    });

    it('WHEN a placed name is read THEN its position returns', () => {
      expect(positionOf(PLACED, 'b')).toStrictEqual(B_AT);
    });
  });
});
