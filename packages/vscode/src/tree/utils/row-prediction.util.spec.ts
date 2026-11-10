import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { rowPredictionOf } from './row-prediction.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { PredictionCache, PredictionView } from '../common/prediction.type.ts';
import { TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const SETTLED = new Date(2026, 10, 9, 14, 5).getTime();
const TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };

const viewOf = (cache: PredictionCache): PredictionView => {
  const view: PredictionView = { settledAt: SETTLED, tasks: new Map([['a#build', cache]]) };

  return view;
};

const EMPTY_VIEW: PredictionView = { settledAt: SETTLED, tasks: new Map() };

const entryIn = (state: RunEntry['state']): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, state };

  return entry;
};

const IDLE_CASES: [PredictionCache, string, string][] = [
  ['HIT', 'cached', 'Prediction: cached, will replay (as of 14:05)'],
  ['MISS', 'not cached', 'Prediction: not cached, will run (as of 14:05)'],
  ['deferred', 'unknown', 'Prediction: unknown, decided at run time (as of 14:05)']
];

const ENDED_STATES: RunEntry['state'][] = ['passed', 'failed', 'stopped', 'failed-to-start'];

describe('FEATURE: row prediction precedence', () => {
  describe('GIVEN an idle turbo task', () => {
    it.each(IDLE_CASES)('WHEN the view says %s THEN word %s and its line', (cache, description, line) => {
      expect(rowPredictionOf(TASK, undefined, viewOf(cache))).toStrictEqual({ description, line });
    });

    it('WHEN there is no view THEN there is no prediction', () => {
      expect(rowPredictionOf(TASK, undefined, null)).toBeNull();
    });

    it('WHEN the view lacks the id THEN there is no prediction', () => {
      expect(rowPredictionOf(TASK, undefined, EMPTY_VIEW)).toBeNull();
    });

    it('WHEN the task is persistent and the view is stale THEN there is no prediction', () => {
      expect(rowPredictionOf({ ...TASK, persistent: true }, undefined, viewOf('HIT'))).toBeNull();
    });

    it('WHEN the task is a script THEN there is no prediction', () => {
      expect(rowPredictionOf({ ...TASK, isTurboTask: false }, undefined, viewOf('HIT'))).toBeNull();
    });
  });

  describe('GIVEN a live run', () => {
    it('WHEN the view says HIT THEN there is no prediction', () => {
      expect(rowPredictionOf(TASK, entryIn('running'), viewOf('HIT'))).toBeNull();
    });

    it('WHEN the task is continuous THEN there is no prediction', () => {
      expect(rowPredictionOf({ ...TASK, persistent: true }, entryIn('running'), viewOf('HIT'))).toBeNull();
    });
  });

  describe('GIVEN an ended run', () => {
    it.each(ENDED_STATES)('WHEN it %s and the view says HIT THEN the word is cached', (state) => {
      expect(rowPredictionOf(TASK, entryIn(state), viewOf('HIT'))?.description).toBe('cached');
    });

    it('WHEN there is no view THEN there is no prediction', () => {
      expect(rowPredictionOf(TASK, entryIn('failed'), null)).toBeNull();
    });

    it('WHEN the view lacks the id THEN there is no prediction', () => {
      expect(rowPredictionOf(TASK, entryIn('passed'), EMPTY_VIEW)).toBeNull();
    });
  });
});
