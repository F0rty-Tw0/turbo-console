import { describe, expect, it } from 'vitest';

import { restorePlanOf } from './view-restore.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestorePlan } from '../common/restore-plan.type.ts';

const PAN: Position = { x: -10, y: 20 };

const SAVED: GraphViewState = {
  hash: 'h1',
  zoom: 1.5,
  pan: PAN,
  selected: 'web',
  controlsOpen: true,
  search: '',
  depth: 1,
  hidden: [],
  focus: null,
  tags: [],
  detailsOpen: true,
  link: null,
  trace: null,
  folder: null,
  grouped: false,
  collapsed: [],
  mode: 'packages',
  task: null
};

describe('FEATURE: restorePlanOf', () => {
  it('GIVEN no saved state WHEN a graph is placed THEN it is fitted', () => {
    const expected: RestorePlan = { kind: 'fit' };

    const plan = restorePlanOf(null, 'h1');

    expect(plan).toStrictEqual(expected);
  });

  it('GIVEN a saved state for the same hash WHEN a graph is placed THEN the camera is restored', () => {
    const expected: RestorePlan = { kind: 'restore', zoom: 1.5, pan: PAN };

    const plan = restorePlanOf(SAVED, 'h1');

    expect(plan).toStrictEqual(expected);
  });

  it('GIVEN a saved state for another hash WHEN a graph is placed THEN it is fitted', () => {
    const expected: RestorePlan = { kind: 'fit' };

    const plan = restorePlanOf(SAVED, 'h2');

    expect(plan).toStrictEqual(expected);
  });
});
