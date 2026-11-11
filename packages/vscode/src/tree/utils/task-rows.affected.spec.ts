import type { PackageNode, RunMatch, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskRowOf } from './task-rows.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { AffectedView } from '../common/affected.type.ts';
import { FAILED_ICON } from '../common/icon.const.ts';
import type { PredictionView } from '../common/prediction.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { AFFECTED_SETTLED_STUB, AFFECTED_VIEW_STUB, CHANGED_LINE_STUB } from '../test/stubs/affected-view.stub.ts';
import { PACKAGE_NODE_STUB, ROW_SCOPE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { readsOf } from '../test/utils/affected-reads.spec.util.ts';
import { ROW_NOW, rowContextOf } from '../test/utils/row-context.spec.util.ts';

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200, interrupted: false };
const BUILD: TaskNode = { ...TASK_NODE_STUB, id: 'a#build', command: null };
const TEST: TaskNode = { ...BUILD, id: 'a#test' };

const HIT_VIEW: PredictionView = { settledAt: AFFECTED_SETTLED_STUB, tasks: new Map([['a#build', 'HIT']]) };

const endedIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, launchedAt: 1_699_999_990_000, endedAt: 1_700_000_000_000, ...overrides };

  return entry;
};

const rowOf = (
  task: TaskNode,
  entry: RunEntry | undefined,
  view: AffectedView | null,
  prediction: PredictionView | null = null
): TreeRow => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [task] };
  const base = rowContextOf('list', () => entry);
  const context: RowContext = { ...base, affected: readsOf(view), prediction: () => prediction };

  const row = taskRowOf(ROW_SCOPE_STUB, pkg, task.id, context);

  if (row === undefined) throw new Error('row missing');

  return row;
};

const isAffected = (line: string): boolean => line.startsWith('Affected');

describe('FEATURE: task row affected mark', () => {
  describe('GIVEN an idle task', () => {
    it('WHEN its mark is changed THEN the row says affected with the line last', () => {
      const row = rowOf(BUILD, undefined, AFFECTED_VIEW_STUB);

      expect([row.description, row.tooltip.at(-1)]).toStrictEqual(['affected', CHANGED_LINE_STUB]);
    });

    it('WHEN its mark is changed THEN the idle icon and the context stay', () => {
      const row = rowOf(BUILD, undefined, AFFECTED_VIEW_STUB);
      const plain = rowOf(BUILD, undefined, null);

      expect([row.icon, row.contextValue]).toStrictEqual([plain.icon, 'turboTask']);
    });

    it('WHEN its mark is dependency THEN the row says affected via dependency', () => {
      const row = rowOf(TEST, undefined, AFFECTED_VIEW_STUB);

      expect(row.description).toBe('affected via dependency');
    });

    it('WHEN there is no view THEN the description is empty and no tooltip line is affected', () => {
      const row = rowOf(BUILD, undefined, null);

      expect(row.description).toBe('');
      expect(row.tooltip.some(isAffected)).toBe(false);
    });

    it('WHEN the prediction says HIT THEN the word follows it and the affected line is after the prediction line', () => {
      const row = rowOf(BUILD, undefined, AFFECTED_VIEW_STUB, HIT_VIEW);

      expect(row.description).toBe('cached · affected');
      expect(row.tooltip.slice(-2)).toStrictEqual(['Prediction: cached, will replay (as of 14:05)', CHANGED_LINE_STUB]);
    });

    it('WHEN the task is continuous THEN the row reads continuous then the word', () => {
      const row = rowOf({ ...BUILD, persistent: true }, undefined, AFFECTED_VIEW_STUB);

      expect(row.description).toBe('continuous · affected');
    });
  });

  describe('GIVEN a live run', () => {
    it('WHEN the task is affected THEN the description is the clock alone and the tooltip still ends with the line', () => {
      const entry = endedIn({ state: 'running', launchedAt: ROW_NOW - 12_345, endedAt: null });

      const row = rowOf(BUILD, entry, AFFECTED_VIEW_STUB);

      expect([row.description, row.tooltip.at(-1)]).toStrictEqual(['running · 12s', CHANGED_LINE_STUB]);
    });
  });

  describe('GIVEN an ended run', () => {
    it('WHEN it failed THEN the exit text leads the word and the failed icon stays', () => {
      const row = rowOf(BUILD, endedIn({ state: 'failed', exitCode: 1 }), AFFECTED_VIEW_STUB);

      expect([row.description, row.icon]).toStrictEqual(['exit 1 · affected', FAILED_ICON]);
    });

    it('WHEN it passed from the cache THEN the duration and cache text lead the word and the cached context stays', () => {
      const row = rowOf(BUILD, endedIn({ state: 'passed', exitCode: 0, match: HIT_MATCH }), AFFECTED_VIEW_STUB);

      expect([row.description, row.contextValue]).toStrictEqual(['3.2s · cached · affected', 'turboTask.cached']);
    });
  });
});
