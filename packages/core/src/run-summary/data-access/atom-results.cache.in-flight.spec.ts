import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dropUnlistedAtomResults, readCachedAtomResults } from './atom-results.cache.ts';
import type * as runSummaryFiles from './run-summary-files.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import type { RunWindow } from '../test/common/run-window.type.ts';
import { summaryOf, taskEntry } from '../test/utils/run-summary.spec.util.ts';

const reads = vi.hoisted(() => {
  const queued: Promise<RunSummary | null>[] = [];
  const state = { count: 0, queued };

  return state;
});

vi.mock('./run-summary-files.ts', async (importOriginal) => {
  const real = await importOriginal<typeof runSummaryFiles>();

  /** Counted, and settled by the spec: the next promise of `reads.queued`, `null` when none is queued. */
  const readRunSummaryFile = async (): Promise<RunSummary | null> => {
    reads.count += 1;

    const queued = reads.queued.shift();

    return queued ?? null;
  };

  const mocked = { ...real, readRunSummaryFile };

  return mocked;
});

const ID = 'web#build';

const OLD_WINDOW: RunWindow = { startTime: 1000, endTime: 2000 };

const NEW_WINDOW: RunWindow = { startTime: 1000, endTime: 3000 };

const OLD = summaryOf('turbo run build', OLD_WINDOW, 0, [taskEntry(ID, OLD_WINDOW, 'MISS')]);

const NEW = summaryOf('turbo run build', NEW_WINDOW, 0, [taskEntry(ID, NEW_WINDOW, 'MISS')]);

const OLD_RESULT: AtomResult = { outcome: 'passed', durationMs: 1000, endedAt: 2000 };

const NEW_RESULT: AtomResult = { outcome: 'passed', durationMs: 2000, endedAt: 3000 };

const FILE: RunSummaryFile = { name: 'run.json', mtimeMs: 1_760_000_000_000, size: 100 };

const LATER: RunSummaryFile = { ...FILE, mtimeMs: FILE.mtimeMs + 1 };

const LONGER: RunSummaryFile = { ...FILE, size: FILE.size + 1 };

const FAILURE = new Error('read failed');

describe('FEATURE: atom results cache in-flight reads', () => {
  beforeEach(() => {
    reads.count = 0;
    reads.queued.length = 0;
  });

  describe('GIVEN a read still in flight', () => {
    it('WHEN read again with the same mtime and size THEN one read answers both with one map', async () => {
      const root = 'in flight, same stamp';
      const read = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(read.promise);

      const first = readCachedAtomResults(root, FILE);
      const second = readCachedAtomResults(root, FILE);

      read.resolve(OLD);

      const [one, other] = await Promise.all([first, second]);

      expect(reads.count).toBe(1);
      expect(one?.get(ID)).toStrictEqual(OLD_RESULT);
      expect(other).toBe(one);
    });

    it('WHEN read with another mtime THEN a read of its own answers it', async () => {
      const root = 'in flight, other mtime';
      const older = Promise.withResolvers<RunSummary | null>();
      const newer = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(older.promise, newer.promise);

      const stale = readCachedAtomResults(root, FILE);
      const fresh = readCachedAtomResults(root, LATER);

      older.resolve(OLD);
      newer.resolve(NEW);
      await stale;

      const results = await fresh;

      expect(results?.get(ID)).toStrictEqual(NEW_RESULT);
    });

    it('WHEN read with another size THEN a read of its own answers it', async () => {
      const root = 'in flight, other size';
      const older = Promise.withResolvers<RunSummary | null>();
      const newer = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(older.promise, newer.promise);

      const stale = readCachedAtomResults(root, FILE);
      const fresh = readCachedAtomResults(root, LONGER);

      older.resolve(OLD);
      newer.resolve(NEW);
      await stale;

      const results = await fresh;

      expect(results?.get(ID)).toStrictEqual(NEW_RESULT);
    });

    it('WHEN it is null THEN every call is null and the next call reads again', async () => {
      const root = 'in flight, null';
      const read = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(read.promise, Promise.resolve(OLD));

      const first = readCachedAtomResults(root, FILE);
      const second = readCachedAtomResults(root, FILE);

      read.resolve(null);

      const both = await Promise.all([first, second]);
      const next = await readCachedAtomResults(root, FILE);

      expect(both).toStrictEqual([null, null]);
      expect(next?.get(ID)).toStrictEqual(OLD_RESULT);
    });

    it('WHEN it rejects THEN every call rejects and the next call reads again', async () => {
      const root = 'in flight, rejected';
      const read = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(read.promise, Promise.resolve(OLD));

      const first = readCachedAtomResults(root, FILE);
      const second = readCachedAtomResults(root, FILE);

      read.reject(FAILURE);

      const both = await Promise.allSettled([first, second]);
      const next = await readCachedAtomResults(root, FILE);

      expect(both.map((call) => call.status)).toStrictEqual(['rejected', 'rejected']);
      expect(next?.get(ID)).toStrictEqual(OLD_RESULT);
    });

    it('WHEN its file is dropped before it settles THEN nothing is kept: the next call reads again', async () => {
      const root = 'in flight, dropped';
      const read = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(read.promise, Promise.resolve(NEW));

      const dropped = readCachedAtomResults(root, FILE);

      dropUnlistedAtomResults(root, []);
      read.resolve(OLD);
      await dropped;

      const next = await readCachedAtomResults(root, FILE);

      expect(next?.get(ID)).toStrictEqual(NEW_RESULT);
    });

    it('WHEN its file is dropped, read again with the same mtime and size, and it then settles null THEN the second map is still the kept one', async () => {
      const root = 'in flight, dropped then read again';
      const read = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(read.promise, Promise.resolve(NEW));

      const dropped = readCachedAtomResults(root, FILE);

      dropUnlistedAtomResults(root, []);

      const kept = await readCachedAtomResults(root, FILE);

      read.resolve(null);
      await dropped;

      const again = await readCachedAtomResults(root, FILE);

      expect(reads.count).toBe(2);
      expect(again).toBe(kept);
    });
  });

  describe('GIVEN a newer read that settled while an older one is in flight', () => {
    it('WHEN the older one settles with results THEN the newer map is still the kept one', async () => {
      const root = 'stale, results';
      const older = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(older.promise, Promise.resolve(NEW));

      const stale = readCachedAtomResults(root, FILE);
      const kept = await readCachedAtomResults(root, LATER);

      older.resolve(OLD);
      await stale;

      const again = await readCachedAtomResults(root, LATER);

      expect(again?.get(ID)).toStrictEqual(NEW_RESULT);
      expect(again).toBe(kept);
    });

    it('WHEN the older one settles null THEN the newer map is still the kept one', async () => {
      const root = 'stale, null';
      const older = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(older.promise, Promise.resolve(NEW));

      const stale = readCachedAtomResults(root, FILE);
      const kept = await readCachedAtomResults(root, LATER);

      older.resolve(null);
      await stale;

      const again = await readCachedAtomResults(root, LATER);

      expect(again?.get(ID)).toStrictEqual(NEW_RESULT);
      expect(again).toBe(kept);
    });

    it('WHEN the older one rejects THEN the newer map is still the kept one', async () => {
      const root = 'stale, rejected';
      const older = Promise.withResolvers<RunSummary | null>();

      reads.queued.push(older.promise, Promise.resolve(NEW));

      const stale = readCachedAtomResults(root, FILE);
      const kept = await readCachedAtomResults(root, LATER);

      older.reject(FAILURE);
      await Promise.allSettled([stale]);

      const again = await readCachedAtomResults(root, LATER);

      expect(again?.get(ID)).toStrictEqual(NEW_RESULT);
      expect(again).toBe(kept);
    });
  });
});
