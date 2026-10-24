import type { AtomResult } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { fileRowsOf, packageFileRows, umbrellaRow } from './atom-rows.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { AtomCache, AtomView } from '../common/atom-view.type.ts';
import {
  ATOM_GROUP_STUB,
  ATOM_VIEW_STUB,
  A_FILE_STUB,
  E2E_PACKAGE_STUB,
  LIVE_FILE_STUB,
  SPACED_FILE_STUB
} from '../test/stubs/atom-view.stub.ts';
import { PACKAGE_NODE_STUB, ROW_SCOPE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { atomContextOf } from '../test/utils/atom-context.spec.util.ts';
import { ROW_NOW } from '../test/utils/row-context.spec.util.ts';

const A_ID = A_FILE_STUB.task.id;
const B_ID = SPACED_FILE_STUB.task.id;
const LIVE_ID = LIVE_FILE_STUB.task.id;

const PASSED: AtomResult = { outcome: 'passed', durationMs: 4200, endedAt: 1_700_000_000_000 };
const FAILED: AtomResult = { outcome: 'failed', durationMs: 7900, endedAt: 1_700_000_000_000 };
const CACHED: AtomResult = { outcome: 'cached', durationMs: 0, endedAt: 1_700_000_000_000 };

const dryRunOf = (a: AtomCache, b: AtomCache, live: AtomCache): ReadonlyMap<string, AtomCache> => {
  const states: [string, AtomCache][] = [
    [A_ID, a],
    [B_ID, b],
    [LIVE_ID, live]
  ];

  return new Map(states);
};

const resultsOf = (a: AtomResult, b: AtomResult, live: AtomResult): ReadonlyMap<string, AtomResult> => {
  const results: [string, AtomResult][] = [
    [A_ID, a],
    [B_ID, b],
    [LIVE_ID, live]
  ];

  return new Map(results);
};

const descriptionOf = (overrides: Partial<AtomView>, runs?: RunLookup): string => {
  const view: AtomView = { ...ATOM_VIEW_STUB, ...overrides };
  const row = umbrellaRow(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, ATOM_GROUP_STUB, atomContextOf(view, runs));

  return row.description;
};

const umbrellaRunOf = (overrides: Partial<RunEntry>): RunLookup => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, taskId: ATOM_GROUP_STUB.umbrella.id, ...overrides };

  return (_root, taskId) => (taskId === entry.taskId ? entry : undefined);
};

describe('FEATURE: atom umbrella row', () => {
  describe('GIVEN neither the dry run nor the results settled', () => {
    it('WHEN the row is built THEN it reads only the file count and is collapsed', () => {
      const row = umbrellaRow(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, ATOM_GROUP_STUB, atomContextOf(ATOM_VIEW_STUB));

      expect([row.kind, row.key, row.description, row.collapsible, row.contextValue]).toStrictEqual([
        'task',
        'e2e#e2e-ci',
        '3 files',
        'collapsed',
        'turboTask'
      ]);
    });
  });

  describe('GIVEN only the dry run settled', () => {
    it('WHEN one file is a HIT THEN the cached count follows the file count', () => {
      const description = descriptionOf({ dryRun: dryRunOf('HIT', 'MISS', 'MISS') });

      expect(description).toBe('3 files · 1 cached');
    });

    it('WHEN one file is deferred and one a HIT THEN the deferred file is not counted', () => {
      const description = descriptionOf({ dryRun: dryRunOf('deferred', 'HIT', 'MISS') });

      expect(description).toBe('3 files · 1 cached');
    });

    it('WHEN no file is a HIT THEN the cached count reads 0', () => {
      const description = descriptionOf({ dryRun: dryRunOf('MISS', 'MISS', 'deferred') });

      expect(description).toBe('3 files · 0 cached');
    });
  });

  describe('GIVEN only the results settled', () => {
    it('WHEN one file failed THEN the failed count follows the file count and no cached part shows', () => {
      const description = descriptionOf({ results: resultsOf(PASSED, FAILED, PASSED) });

      expect(description).toBe('3 files · 1 failed');
    });

    it('WHEN no file failed THEN the description reads only the file count', () => {
      const description = descriptionOf({ results: resultsOf(PASSED, CACHED, PASSED) });

      expect(description).toBe('3 files');
    });
  });

  describe('GIVEN both parts settled', () => {
    const settled: Partial<AtomView> = { dryRun: dryRunOf('HIT', 'MISS', 'HIT'), results: resultsOf(PASSED, FAILED, PASSED) };

    it('WHEN the umbrella is idle THEN cached and failed counts both show', () => {
      const description = descriptionOf(settled);

      expect(description).toBe('3 files · 2 cached · 1 failed');
    });

    it('WHEN the umbrella run is running THEN the running prefix leads the counts', () => {
      const running = umbrellaRunOf({ state: 'running', launchedAt: ROW_NOW - 12_345 });
      const view: AtomView = { ...ATOM_VIEW_STUB, ...settled };

      const row = umbrellaRow(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, ATOM_GROUP_STUB, atomContextOf(view, running));

      expect([row.description, row.contextValue, row.icon.id]).toStrictEqual([
        'running · 12s · 3 files · 2 cached · 1 failed',
        'turboTask.running',
        'sync~spin'
      ]);
    });

    it('WHEN the umbrella run ended passed THEN the counts alone show and the icon is the passed one', () => {
      const passed = umbrellaRunOf({ state: 'passed', launchedAt: ROW_NOW - 20_000, endedAt: ROW_NOW - 5000, exitCode: 0 });
      const view: AtomView = { ...ATOM_VIEW_STUB, ...settled };

      const row = umbrellaRow(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, ATOM_GROUP_STUB, atomContextOf(view, passed));

      expect([row.description, row.icon.id]).toStrictEqual(['3 files · 2 cached · 1 failed', 'pass']);
    });
  });
});

describe('FEATURE: atom file rows of a package', () => {
  describe('GIVEN a group of three files', () => {
    it('WHEN its file rows are built THEN there is one row per file in group order', () => {
      const rows = fileRowsOf(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, ATOM_GROUP_STUB, atomContextOf(ATOM_VIEW_STUB));

      expect(rows.map((row) => row.label)).toStrictEqual(['tests/a.spec.ts', 'tests/b fails.spec.ts', 'tests/live.spec.ts']);
    });
  });

  describe('GIVEN a package with a group', () => {
    it('WHEN the package file rows are built THEN every file of the group is a row', () => {
      const rows = packageFileRows(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, atomContextOf(ATOM_VIEW_STUB));

      expect(rows.map((row) => row.key)).toStrictEqual([A_ID, B_ID, LIVE_ID]);
    });
  });

  describe('GIVEN a package without groups', () => {
    it('WHEN the package file rows are built THEN there are none', () => {
      const rows = packageFileRows(ROW_SCOPE_STUB, PACKAGE_NODE_STUB, atomContextOf(ATOM_VIEW_STUB));

      expect(rows).toStrictEqual([]);
    });
  });
});
