import type { AtomResult } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { umbrellaRow } from './atom-rows.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { AffectedView } from '../common/affected.type.ts';
import type { AtomCache, AtomView } from '../common/atom-view.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { AFFECTED_SETTLED_STUB } from '../test/stubs/affected-view.stub.ts';
import {
  ATOM_GROUP_STUB,
  ATOM_VIEW_STUB,
  A_FILE_STUB,
  E2E_PACKAGE_STUB,
  LIVE_FILE_STUB,
  SPACED_FILE_STUB
} from '../test/stubs/atom-view.stub.ts';
import { ROW_SCOPE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { readsOf } from '../test/utils/affected-reads.spec.util.ts';
import { atomContextOf } from '../test/utils/atom-context.spec.util.ts';
import { ROW_NOW } from '../test/utils/row-context.spec.util.ts';

const UMBRELLA_LINE = 'Affected (task level): depends on lib#build, which is affected (as of 14:05)';

const VIEW: AffectedView = {
  settledAt: AFFECTED_SETTLED_STUB,
  mode: 'task',
  tasks: new Map([[ATOM_GROUP_STUB.umbrella.id, { mark: 'dependency', line: UMBRELLA_LINE }]])
};

const PASSED: AtomResult = { outcome: 'passed', durationMs: 4200, endedAt: 1_700_000_000_000 };
const FAILED: AtomResult = { outcome: 'failed', durationMs: 7900, endedAt: 1_700_000_000_000 };

const SETTLED: Partial<AtomView> = {
  dryRun: new Map<string, AtomCache>([
    [A_FILE_STUB.task.id, 'HIT'],
    [SPACED_FILE_STUB.task.id, 'MISS'],
    [LIVE_FILE_STUB.task.id, 'HIT']
  ]),
  results: new Map<string, AtomResult>([
    [A_FILE_STUB.task.id, PASSED],
    [SPACED_FILE_STUB.task.id, FAILED],
    [LIVE_FILE_STUB.task.id, PASSED]
  ])
};

const umbrellaRunOf = (overrides: Partial<RunEntry>): RunLookup => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, taskId: ATOM_GROUP_STUB.umbrella.id, ...overrides };

  return (_root, taskId) => (taskId === entry.taskId ? entry : undefined);
};

const rowOf = (view: AffectedView | null, overrides: Partial<AtomView> = {}, runs?: RunLookup): TreeRow => {
  const atoms: AtomView = { ...ATOM_VIEW_STUB, ...overrides };
  const base = atomContextOf(atoms, runs);
  const context: RowContext = { ...base, affected: readsOf(view) };

  return umbrellaRow(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, ATOM_GROUP_STUB, context);
};

describe('FEATURE: atom umbrella row affected mark', () => {
  describe('GIVEN an idle umbrella marked as a dependency', () => {
    it('WHEN it has no results THEN the counts lead the word and the line is last', () => {
      const row = rowOf(VIEW);

      expect([row.description, row.tooltip.at(-1)]).toStrictEqual(['3 files · affected via dependency', UMBRELLA_LINE]);
    });

    it('WHEN its results settled THEN all counts lead the word', () => {
      const row = rowOf(VIEW, SETTLED);

      expect(row.description).toBe('3 files · 2 cached · 1 failed · affected via dependency');
    });

    it('WHEN its run passed THEN the counts lead the word', () => {
      const runs = umbrellaRunOf({ state: 'passed', exitCode: 0, endedAt: 1_700_000_000_000 });

      const row = rowOf(VIEW, SETTLED, runs);

      expect(row.description).toBe('3 files · 2 cached · 1 failed · affected via dependency');
    });
  });

  describe('GIVEN a running umbrella', () => {
    it('WHEN it is marked THEN the running text has no word and the tooltip still ends with the line', () => {
      const runs = umbrellaRunOf({ state: 'running', launchedAt: ROW_NOW - 12_345 });

      const row = rowOf(VIEW, SETTLED, runs);

      expect([row.description, row.tooltip.at(-1)]).toStrictEqual(['running · 12s · 3 files · 2 cached · 1 failed', UMBRELLA_LINE]);
    });
  });

  describe('GIVEN no affected view', () => {
    it('WHEN the umbrella is built THEN the description and the tooltip are those of an unmarked umbrella', () => {
      const row = rowOf(null, SETTLED);

      expect(row.description).toBe('3 files · 2 cached · 1 failed');
      expect(row.tooltip.some((line) => line.startsWith('Affected'))).toBe(false);
    });
  });
});
