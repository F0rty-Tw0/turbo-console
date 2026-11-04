import { describe, expect, it } from 'vitest';

import { groupedRootOptionsOf, layeredOptionsOf, paddedOptionsOf, taskLayeringOf, thoroughnessOf } from './elk-options.util.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';

const PADDING = '[top=32,left=32,bottom=32,right=32]';

describe('FEATURE: thoroughnessOf', () => {
  it.each([
    [0, '7'],
    [150, '7'],
    [151, '1'],
    [5000, '1']
  ])('GIVEN %i leaves WHEN thoroughnessOf THEN %s', (leafCount, expected) => {
    const thoroughness = thoroughnessOf(leafCount);

    expect(thoroughness).toBe(expected);
  });
});

describe('FEATURE: layeredOptionsOf', () => {
  it('GIVEN 19 leaves and NETWORK_SIMPLEX WHEN layeredOptionsOf THEN NETWORK_SIMPLEX, SIMPLE, POLYLINE, ROOT, DOWN, thoroughness 7', () => {
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

  it('GIVEN 19 leaves and LONGEST_PATH WHEN layeredOptionsOf THEN the same literal with LONGEST_PATH', () => {
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

describe('FEATURE: paddedOptionsOf', () => {
  it('GIVEN 151 leaves WHEN paddedOptionsOf THEN thoroughness 1 and the 32 px padding', () => {
    const options = paddedOptionsOf(151, 'NETWORK_SIMPLEX');

    expect(options).toMatchObject({ 'elk.layered.thoroughness': '1', 'elk.padding': PADDING });
  });

  it('GIVEN LONGEST_PATH WHEN paddedOptionsOf THEN it carries LONGEST_PATH', () => {
    const options = paddedOptionsOf(3, 'LONGEST_PATH');

    expect(options).toMatchObject({ 'elk.layered.layering.strategy': 'LONGEST_PATH' });
  });
});

describe('FEATURE: groupedRootOptionsOf', () => {
  it('GIVEN 150 leaves WHEN groupedRootOptionsOf THEN thoroughness 7 and INCLUDE_CHILDREN', () => {
    const options = groupedRootOptionsOf(150, 'NETWORK_SIMPLEX');

    expect(options).toMatchObject({ 'elk.layered.thoroughness': '7', 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' });
  });

  it('GIVEN LONGEST_PATH WHEN groupedRootOptionsOf THEN it carries LONGEST_PATH and no padding', () => {
    const options = groupedRootOptionsOf(3, 'LONGEST_PATH');

    expect(options).toMatchObject({ 'elk.layered.layering.strategy': 'LONGEST_PATH' });
    expect(options).not.toHaveProperty('elk.padding');
  });
});

describe('FEATURE: taskLayeringOf', () => {
  it.each([
    [true, 'LONGEST_PATH'],
    [false, 'NETWORK_SIMPLEX']
  ])('GIVEN a naming with grouped %s WHEN taskLayeringOf THEN %s', (grouped, expected) => {
    const naming: TaskNaming = { ...NAMING_STUB, grouped };

    const layering = taskLayeringOf(naming);

    expect(layering).toBe(expected);
  });
});
