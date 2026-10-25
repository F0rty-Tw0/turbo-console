import type { AtomFile, AtomResult, RunMatch } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { fileRow } from './atom-rows.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { AtomCache, AtomView } from '../common/atom-view.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { ATOM_VIEW_STUB, A_FILE_STUB, E2E_PACKAGE_STUB, LIVE_FILE_STUB, SPACED_FILE_STUB } from '../test/stubs/atom-view.stub.ts';
import { ROW_SCOPE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { atomContextOf } from '../test/utils/atom-context.spec.util.ts';
import { ROW_NOW } from '../test/utils/row-context.spec.util.ts';

const ENDED_AT = 1_700_000_000_000;

const passedIn = (durationMs: number | null): AtomResult => {
  const result: AtomResult = { outcome: 'passed', durationMs, endedAt: ENDED_AT };

  return result;
};

const FAILED_7900: AtomResult = { outcome: 'failed', durationMs: 7900, endedAt: ENDED_AT };

const CACHED: AtomResult = { outcome: 'cached', durationMs: 0, endedAt: ENDED_AT };

const resultOf = (file: AtomFile, result: AtomResult): Partial<AtomView> => {
  const results = new Map([[file.task.id, result]]);
  const view: Partial<AtomView> = { results };

  return view;
};

const cacheOf = (file: AtomFile, cache: AtomCache): Partial<AtomView> => {
  const dryRun = new Map([[file.task.id, cache]]);
  const view: Partial<AtomView> = { dryRun };

  return view;
};

const rowOf = (file: AtomFile, overrides: Partial<AtomView> = {}, entry?: RunEntry): TreeRow => {
  const view: AtomView = { ...ATOM_VIEW_STUB, ...overrides };
  const runs: RunLookup = () => entry;

  return fileRow(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, file, atomContextOf(view, runs));
};

const runIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, taskId: A_FILE_STUB.task.id, ...overrides };

  return entry;
};

describe('FEATURE: atom file row', () => {
  describe('GIVEN a file with no result and no run', () => {
    it('WHEN the row is built THEN it is a bare, plain, unclickable file row', () => {
      const row = rowOf(A_FILE_STUB);

      expect([row.kind, row.description, row.icon, row.contextValue, row.collapsible, row.command]).toStrictEqual([
        'task',
        '',
        { id: 'file', color: null },
        'turboTask.atomFile',
        'none',
        null
      ]);
    });
  });

  describe('GIVEN a path that holds a space', () => {
    it('WHEN the row is built THEN key, id, label and tooltip carry it unchanged', () => {
      const row = fileRow(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, SPACED_FILE_STUB, atomContextOf(ATOM_VIEW_STUB));

      expect([row.key, row.id, row.label, row.tooltip[0]]).toStrictEqual([
        'e2e#e2e-ci--tests/b fails.spec.ts',
        'task:/ws\0e2e#e2e-ci--tests/b fails.spec.ts',
        'tests/b fails.spec.ts',
        'Task: e2e-ci--tests/b fails.spec.ts'
      ]);
    });
  });

  describe('GIVEN a result and no running run', () => {
    it('WHEN the file passed in 4200 ms THEN it reads the tick and the passed icon', () => {
      const row = rowOf(A_FILE_STUB, resultOf(A_FILE_STUB, passedIn(4200)));

      expect([row.description, row.icon.id]).toStrictEqual(['✓ 4.2s', 'pass']);
    });

    it('WHEN the file failed in 7900 ms THEN it reads the cross and the failed icon', () => {
      const row = rowOf(A_FILE_STUB, resultOf(A_FILE_STUB, FAILED_7900));

      expect([row.description, row.icon.id]).toStrictEqual(['✗ 7.9s', 'error']);
    });

    it('WHEN the file was cached THEN it reads cached with the passed icon', () => {
      const row = rowOf(A_FILE_STUB, resultOf(A_FILE_STUB, CACHED));

      expect([row.description, row.icon.id]).toStrictEqual(['cached', 'pass']);
    });

    it('WHEN the duration is unknown THEN the tick stands alone', () => {
      const row = rowOf(A_FILE_STUB, resultOf(A_FILE_STUB, passedIn(null)));

      expect(row.description).toBe('✓');
    });

    it('WHEN the duration is unknown and the file failed THEN the cross stands alone', () => {
      const unknown: AtomResult = { ...FAILED_7900, durationMs: null };
      const row = rowOf(A_FILE_STUB, resultOf(A_FILE_STUB, unknown));

      expect(row.description).toBe('✗');
    });
  });

  describe('GIVEN a live file', () => {
    it('WHEN it passed in 4200 ms THEN live leads the result', () => {
      const row = rowOf(LIVE_FILE_STUB, resultOf(LIVE_FILE_STUB, passedIn(4200)));

      expect(row.description).toBe('live · ✓ 4.2s');
    });

    it('WHEN it has no result THEN the description is only live', () => {
      const row = rowOf(LIVE_FILE_STUB);

      expect(row.description).toBe('live');
    });
  });

  describe('GIVEN a run entry for the file', () => {
    it('WHEN the run is running THEN the running text, icon and context win over the result', () => {
      const running = runIn({ state: 'running', launchedAt: ROW_NOW - 12_345 });
      const row = rowOf(A_FILE_STUB, resultOf(A_FILE_STUB, FAILED_7900), running);

      expect([row.description, row.icon.id, row.contextValue]).toStrictEqual([
        'running · 12s',
        'sync~spin',
        'turboTask.running.atomFile'
      ]);
    });

    it('WHEN the run ended as a cache hit and the result failed THEN the context is cached and the text is the result', () => {
      const match: RunMatch = { cache: 'HIT', durationMs: 100 };
      const ended = runIn({ state: 'passed', exitCode: 0, endedAt: ROW_NOW, match });
      const row = rowOf(A_FILE_STUB, resultOf(A_FILE_STUB, FAILED_7900), ended);

      expect([row.description, row.contextValue]).toStrictEqual(['✗ 7.9s', 'turboTask.cached.atomFile']);
    });
  });

  describe('GIVEN the tooltip of a file', () => {
    it('WHEN it passed and the dry run says HIT THEN the four lines name task, result, end time and cache', () => {
      const withResult = resultOf(A_FILE_STUB, passedIn(4200));
      const withCache = cacheOf(A_FILE_STUB, 'HIT');
      const overrides: Partial<AtomView> = { ...withResult, ...withCache };
      const row = rowOf(A_FILE_STUB, overrides);

      expect(row.tooltip).toStrictEqual([
        'Task: e2e-ci--tests/a.spec.ts',
        'Last result: passed',
        'Ended: 2023-11-14T22:13:20.000Z',
        'Dry run: HIT'
      ]);
    });

    it('WHEN there is no result and the dry run says MISS THEN the result reads none and the cache MISS', () => {
      const row = rowOf(A_FILE_STUB, cacheOf(A_FILE_STUB, 'MISS'));

      expect(row.tooltip).toStrictEqual(['Task: e2e-ci--tests/a.spec.ts', 'Last result: none', 'Dry run: MISS']);
    });

    it('WHEN the dry run says deferred THEN the cache reads unknown', () => {
      const row = rowOf(A_FILE_STUB, cacheOf(A_FILE_STUB, 'deferred'));

      expect(row.tooltip).toStrictEqual(['Task: e2e-ci--tests/a.spec.ts', 'Last result: none', 'Dry run: unknown']);
    });

    it('WHEN the dry run has not settled THEN the cache reads unknown', () => {
      const row = rowOf(A_FILE_STUB);

      expect(row.tooltip).toStrictEqual(['Task: e2e-ci--tests/a.spec.ts', 'Last result: none', 'Dry run: unknown']);
    });

    it('WHEN the dry run settled without this file THEN the cache reads unknown', () => {
      const row = rowOf(A_FILE_STUB, cacheOf(SPACED_FILE_STUB, 'HIT'));

      expect(row.tooltip.at(-1)).toBe('Dry run: unknown');
    });

    it('WHEN the file is live THEN the live note closes the tooltip', () => {
      const row = rowOf(LIVE_FILE_STUB);

      expect(row.tooltip.at(-1)).toBe("Live spec: uncached unless the Atomizer's commitEnv is set");
    });
  });
});
