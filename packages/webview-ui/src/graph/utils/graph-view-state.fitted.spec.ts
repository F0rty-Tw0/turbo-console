import { describe, expect, it } from 'vitest';

import { freshTaskViewOf, freshViewStateOf } from './fresh-view-state.util.ts';
import { readGraphViewState } from './graph-view-state.util.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

type FittedRow = readonly [unknown, boolean];

const FITTED_ROWS: FittedRow[] = [
  [true, true],
  [false, false],
  [undefined, false],
  ['yes', false],
  [1, false],
  [null, false]
];

const packageStateOf = (fitted: unknown): unknown => {
  const fresh = freshViewStateOf('h');
  const state = { ...fresh, fitted };

  return state;
};

const taskStateOf = (fitted: unknown): unknown => {
  const fresh = freshViewStateOf('h');
  const freshTask = freshTaskViewOf();
  const task = { ...freshTask, fitted };
  const state = { ...fresh, mode: 'tasks', task };

  return state;
};

describe('FEATURE: readGraphViewState fitted', () => {
  describe('GIVEN a saved package camera', () => {
    it.each(FITTED_ROWS)('WHEN fitted is %s THEN the package camera reads %s', (fitted: unknown, expected: boolean) => {
      const raw = packageStateOf(fitted);

      const state: GraphViewState | null = readGraphViewState(raw);

      expect(state?.fitted).toBe(expected);
    });
  });

  describe('GIVEN a saved task camera', () => {
    it.each(FITTED_ROWS)('WHEN fitted is %s THEN the task camera reads %s', (fitted: unknown, expected: boolean) => {
      const raw = taskStateOf(fitted);

      const state: GraphViewState | null = readGraphViewState(raw);

      expect(state?.task?.fitted).toBe(expected);
    });
  });
});
