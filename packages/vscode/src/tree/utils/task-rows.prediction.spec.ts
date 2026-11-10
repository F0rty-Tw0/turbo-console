import type { PackageNode, RunMatch, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskRowOf } from './task-rows.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { PredictionCache, PredictionView } from '../common/prediction.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { IconSpec, TreeRow } from '../common/tree-row.type.ts';
import { PACKAGE_NODE_STUB, ROW_SCOPE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const SETTLED = new Date(2026, 10, 9, 14, 5).getTime();
const PASSED_ICON: IconSpec = { id: 'pass', color: 'testing.iconPassed' };
const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200, interrupted: false };
const TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#build', command: null };

const viewOf = (cache: PredictionCache): PredictionView => {
  const view: PredictionView = { settledAt: SETTLED, tasks: new Map([['a#build', cache]]) };

  return view;
};

const endedIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, launchedAt: 1_699_999_990_000, endedAt: 1_700_000_000_000, ...overrides };

  return entry;
};

const rowOf = (task: TaskNode, entry: RunEntry | undefined, view: PredictionView | null): TreeRow => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [task] };
  const base = rowContextOf('list', () => entry);
  const context: RowContext = { ...base, prediction: () => view };

  const row = taskRowOf(ROW_SCOPE_STUB, pkg, task.id, context);

  if (row === undefined) throw new Error('row missing');

  return row;
};

const isPrediction = (line: string): boolean => line.startsWith('Prediction');

const isStarted = (line: string): boolean => line.startsWith('Started:');
const isEnded = (line: string): boolean => line.startsWith('Ended:');

const hasPrediction = (row: TreeRow): boolean => row.tooltip.some(isPrediction);

describe('FEATURE: task row cache prediction', () => {
  describe('GIVEN an idle task', () => {
    it('WHEN the view says HIT THEN the row says cached, with the line last and the idle icon kept', () => {
      const row = rowOf(TASK, undefined, viewOf('HIT'));
      const plain = rowOf(TASK, undefined, null);

      expect(row.description).toBe('cached');
      expect(row.tooltip.at(-1)).toBe('Prediction: cached, will replay (as of 14:05)');
      expect(row.icon).toStrictEqual(plain.icon);
      expect(row.contextValue).toBe('turboTask');
    });

    it('WHEN the view says MISS THEN the row says not cached', () => {
      expect(rowOf(TASK, undefined, viewOf('MISS')).description).toBe('not cached');
    });

    it('WHEN the view says deferred THEN the row says unknown', () => {
      expect(rowOf(TASK, undefined, viewOf('deferred')).description).toBe('unknown');
    });

    it('WHEN there is no view THEN the description is empty and no tooltip line is a prediction', () => {
      const row = rowOf(TASK, undefined, null);

      expect(row.description).toBe('');
      expect(hasPrediction(row)).toBe(false);
    });

    it('WHEN the task is continuous with a stale HIT THEN the row keeps continuous and has no prediction line', () => {
      const row = rowOf({ ...TASK, persistent: true }, undefined, viewOf('HIT'));

      expect(row.description).toBe('continuous');
      expect(row.tooltip[0]).toBe('Continuous task: runs until stopped (persistent)');
      expect(hasPrediction(row)).toBe(false);
    });
  });

  describe('GIVEN a live run', () => {
    it('WHEN the view says HIT THEN the run text stays and no prediction line is added', () => {
      const row = rowOf(TASK, RUN_ENTRY_STUB, viewOf('HIT'));

      expect(row.description.startsWith('running · ')).toBe(true);
      expect(hasPrediction(row)).toBe(false);
    });
  });

  describe('GIVEN an ended passed run that hit the cache', () => {
    const entry = endedIn({ state: 'passed', exitCode: 0, match: HIT_MATCH });

    it('WHEN the view says MISS THEN the word replaces the duration but icon and actions stay', () => {
      const row = rowOf(TASK, entry, viewOf('MISS'));

      expect(row.description).toBe('not cached');
      expect(row.icon).toStrictEqual(PASSED_ICON);
      expect(row.contextValue).toBe('turboTask.cached');
    });

    it('WHEN the row is read THEN the run lines stay and the prediction line is last, after the kind', () => {
      const tooltip = rowOf(TASK, entry, viewOf('MISS')).tooltip;

      expect(tooltip).toContain('Exit code: 0');
      expect(tooltip.some(isStarted)).toBe(true);
      expect(tooltip.some(isEnded)).toBe(true);
      expect(tooltip.at(-1)).toBe('Prediction: not cached, will run (as of 14:05)');
      expect(tooltip.indexOf('Kind: task')).toBeLessThan(tooltip.length - 1);
    });
  });

  describe('GIVEN an ended failed run', () => {
    it('WHEN there is no view THEN the ended text stays and there is no prediction line', () => {
      const row = rowOf(TASK, endedIn({ state: 'failed', exitCode: 1 }), null);

      expect(row.description).toBe('exit 1');
      expect(hasPrediction(row)).toBe(false);
    });
  });
});
