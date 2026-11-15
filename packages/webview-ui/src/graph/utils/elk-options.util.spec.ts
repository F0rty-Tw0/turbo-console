import { describe, expect, it } from 'vitest';

import { groupedRootOptionsOf, layeredOptionsOf, paddedOptionsOf, taskLayeringOf, thoroughnessOf } from './elk-options.util.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';

const PADDING = '[top=32,left=32,bottom=32,right=32]';

describe('FEATURE: ELK options', () => {
  describe('GIVEN a leaf count to read the thoroughness for', () => {
    describe.each([
      [0, '7'],
      [100, '7'],
      [101, '1'],
      [5000, '1']
    ])('GIVEN %i leaves', (leafCount, expected) => {
      it(`WHEN thoroughnessOf THEN ${expected}`, () => {
        const thoroughness = thoroughnessOf(leafCount);

        expect(thoroughness).toBe(expected);
      });
    });
  });

  describe('GIVEN a leaf count and a layering for layered options', () => {
    describe('GIVEN 19 leaves and NETWORK_SIMPLEX', () => {
      it('WHEN layeredOptionsOf THEN NETWORK_SIMPLEX, SIMPLE, POLYLINE, ROOT, DOWN, thoroughness 7', () => {
        const options = layeredOptionsOf(19, 'NETWORK_SIMPLEX');

        expect(options).toStrictEqual({
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.layered.thoroughness': '7',
          'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
          'elk.layered.nodePlacement.strategy': 'SIMPLE',
          'elk.edgeRouting': 'POLYLINE',
          'elk.json.edgeCoords': 'ROOT'
        });
      });
    });

    describe('GIVEN 19 leaves and LONGEST_PATH', () => {
      it('WHEN layeredOptionsOf THEN the same literal with LONGEST_PATH', () => {
        const options = layeredOptionsOf(19, 'LONGEST_PATH');

        expect(options).toStrictEqual({
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.layered.thoroughness': '7',
          'elk.layered.layering.strategy': 'LONGEST_PATH',
          'elk.layered.nodePlacement.strategy': 'SIMPLE',
          'elk.edgeRouting': 'POLYLINE',
          'elk.json.edgeCoords': 'ROOT'
        });
      });
    });
  });

  describe('GIVEN a leaf count and a layering for padded options', () => {
    describe('GIVEN 101 leaves', () => {
      it('WHEN paddedOptionsOf THEN thoroughness 1 and the 32 px padding', () => {
        const options = paddedOptionsOf(101, 'NETWORK_SIMPLEX');

        expect(options).toMatchObject({ 'elk.layered.thoroughness': '1', 'elk.padding': PADDING });
      });
    });

    describe('GIVEN LONGEST_PATH', () => {
      it('WHEN paddedOptionsOf THEN it carries LONGEST_PATH', () => {
        const options = paddedOptionsOf(3, 'LONGEST_PATH');

        expect(options).toMatchObject({ 'elk.layered.layering.strategy': 'LONGEST_PATH' });
      });
    });
  });

  describe('GIVEN a leaf count and a layering for grouped root options', () => {
    describe('GIVEN 100 leaves', () => {
      it('WHEN groupedRootOptionsOf THEN thoroughness 7 and INCLUDE_CHILDREN', () => {
        const options = groupedRootOptionsOf(100, 'NETWORK_SIMPLEX');

        expect(options).toMatchObject({ 'elk.layered.thoroughness': '7', 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' });
      });
    });

    describe('GIVEN LONGEST_PATH', () => {
      it('WHEN groupedRootOptionsOf THEN it carries LONGEST_PATH and no padding', () => {
        const options = groupedRootOptionsOf(3, 'LONGEST_PATH');

        expect(options).toMatchObject({ 'elk.layered.layering.strategy': 'LONGEST_PATH' });
        expect(options).not.toHaveProperty('elk.padding');
      });
    });
  });

  describe('GIVEN a task naming to read the layering for', () => {
    describe.each([
      [true, 'LONGEST_PATH'],
      [false, 'NETWORK_SIMPLEX']
    ])('GIVEN a naming with grouped %s', (grouped, expected) => {
      it(`WHEN taskLayeringOf THEN ${expected}`, () => {
        const naming: TaskNaming = { ...NAMING_STUB, grouped };

        const layering = taskLayeringOf(naming);

        expect(layering).toBe(expected);
      });
    });
  });
});
