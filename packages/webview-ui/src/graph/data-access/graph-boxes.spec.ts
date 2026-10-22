import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { packageNodes, setBoxes } from './graph-boxes.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB, GONE_GROUP_STUB, PROTO_NAMES_GROUP_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { styleTextOf } from '../test/utils/folder-boxes.spec.util.ts';

const BOX_IDS = ['\u0001', '\u0001apps', '\u0001packages'];

const BOUNDS = { includeLabels: false, includeOverlays: false };

const idOf = (node: NodeSingular): string => node.id();

const boxIdsOf = (cy: Core): string[] => {
  const boxes = cy.nodes(':parent');
  const ids = boxes.map(idOf);

  return ids.sort();
};

const parentIdsOf = (cy: Core, ids: string[]): string[] => {
  const parentOf = (id: string): string[] => cy.getElementById(id).parent().map(idOf);

  return ids.flatMap(parentOf);
};

const centreXOf = (cy: Core, id: string): number => cy.getElementById(id).position('x');

/** `CANVAS_COLORS.frame` (`#444`) as the `rgb(...)` text Cytoscape resolves it to. */
const FRAME_RGB = 'rgb(68,68,68)';

const PACKAGE_IDS = ['a', 'b', 'c'];

const CHILD_IDS = ['a', 'b'];

const ALL_IDS = ['a', 'b', 'c', 'd', '__proto__'];

const PROTO_IDS = ['__proto__', 'constructor'];

describe('FEATURE: setBoxes', () => {
  let cy: Core;

  beforeEach(() => {
    cy = boxedCyMock();
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN three folder groups', () => {
    it('WHEN the boxes are set THEN one box per group exists and a and b sit in the apps box', () => {
      setBoxes(cy, BOX_GROUPS_STUB);

      expect(boxIdsOf(cy)).toStrictEqual(BOX_IDS);
      expect(parentIdsOf(cy, CHILD_IDS)).toStrictEqual(['\u0001apps', '\u0001apps']);
    });

    it('WHEN the boxes are set THEN no package moves', () => {
      setBoxes(cy, BOX_GROUPS_STUB);

      const centres = PACKAGE_IDS.map((id: string): number => centreXOf(cy, id));

      expect(centres).toStrictEqual([0, 100, 500]);
    });

    it('WHEN the boxes are set twice THEN there are still three', () => {
      setBoxes(cy, BOX_GROUPS_STUB);
      setBoxes(cy, BOX_GROUPS_STUB);

      expect(boxIdsOf(cy)).toStrictEqual(BOX_IDS);
    });

    it('WHEN the boxes are set THEN packageNodes lists the five packages only', () => {
      setBoxes(cy, BOX_GROUPS_STUB);

      const ids = packageNodes(cy).map(idOf);

      expect(ids.sort()).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
    });
  });

  describe('GIVEN boxes that were set', () => {
    it('WHEN null is set THEN no box and no parent remain and the graph is as drawn flat', () => {
      setBoxes(cy, BOX_GROUPS_STUB);
      setBoxes(cy, null);

      expect(cy.nodes(':parent')).toHaveLength(0);
      expect(parentIdsOf(cy, ALL_IDS)).toStrictEqual([]);
      expect(cy.nodes()).toHaveLength(5);
      expect(cy.edges()).toHaveLength(2);
    });

    it('WHEN a group names a package that is not drawn THEN it is skipped', () => {
      setBoxes(cy, [GONE_GROUP_STUB]);

      expect(packageNodes(cy)).toHaveLength(5);
      expect(cy.nodes(':parent')).toHaveLength(0);
    });
  });

  describe('GIVEN packages named like Object.prototype keys', () => {
    it('WHEN the boxes are set THEN __proto__ and constructor sit in their box and null frees them', () => {
      const data = { id: 'constructor' };

      cy.add({ data });
      setBoxes(cy, [PROTO_NAMES_GROUP_STUB]);

      expect(parentIdsOf(cy, PROTO_IDS)).toStrictEqual(['\u0001tools', '\u0001tools']);

      setBoxes(cy, null);

      expect(parentIdsOf(cy, PROTO_IDS)).toStrictEqual([]);
    });
  });

  describe('GIVEN the apps box', () => {
    it('WHEN the style applies THEN it has 32 px padding, no label and the 1 px frame colour', () => {
      setBoxes(cy, BOX_GROUPS_STUB);

      const box = cy.getElementById('\u0001apps');

      expect(box.numericStyle('padding')).toBe(32);
      expect(styleTextOf(cy, '\u0001apps', 'label')).toBe('');
      expect(box.numericStyle('border-width')).toBe(1);
      expect(styleTextOf(cy, '\u0001apps', 'border-color')).toBe(FRAME_RGB);
    });

    it('WHEN the style applies THEN its bounds sit 32 to 34 px beyond its packages on every side', () => {
      setBoxes(cy, BOX_GROUPS_STUB);

      const box = cy.getElementById('\u0001apps');
      const outer = box.boundingBox(BOUNDS);
      const inner = box.children().boundingBox(BOUNDS);
      const gaps = [inner.x1 - outer.x1, outer.x2 - inner.x2, inner.y1 - outer.y1, outer.y2 - inner.y2];

      for (const gap of gaps) {
        expect(gap).toBeGreaterThanOrEqual(32);
        expect(gap).toBeLessThanOrEqual(34);
      }
    });
  });
});
