import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { dropUnlistedAtomResults, readCachedAtomResults } from './atom-results.cache.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import type { RunWindow } from '../test/common/run-window.type.ts';
import { newRunsRoot, summaryJson, taskEntry, writeRun } from '../test/utils/run-summary.spec.util.ts';

const WINDOW: RunWindow = { startTime: 1000, endTime: 2000 };

const TASKS = [taskEntry('web#build', WINDOW, 'MISS'), taskEntry('web#lint', WINDOW, 'HIT')];

const TEXT = summaryJson('turbo run build lint', WINDOW, 0, TASKS);

const SECONDS = 1_760_000_000;

const FILE: RunSummaryFile = { name: 'run.json', mtimeMs: SECONDS * 1000, size: TEXT.length };

const BROKEN: RunSummaryFile = { ...FILE, name: 'broken.json' };

const BUILD: AtomResult = { outcome: 'passed', durationMs: 1000, endedAt: 2000 };

const LINT: AtomResult = { outcome: 'cached', durationMs: 1000, endedAt: 2000 };

let tempDir = '';

/** A root named `name` holding `FILE`, and `BROKEN` that is not JSON. */
const newRoot = async (name: string): Promise<string> => {
  const root = await newRunsRoot(tempDir, name);

  await writeRun(root, FILE.name, TEXT, SECONDS);
  await writeRun(root, BROKEN.name, '{ not json', SECONDS);

  return root;
};

describe('FEATURE: atom results cache', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'atom-results-cache-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a summary of two tasks', () => {
    it('WHEN read THEN every task has its result', async () => {
      const root = await newRoot('first read');
      const expected = new Map([
        ['web#build', BUILD],
        ['web#lint', LINT]
      ]);

      await expect(readCachedAtomResults(root, FILE)).resolves.toStrictEqual(expected);
    });
  });

  describe('GIVEN a summary read once', () => {
    it('WHEN read with the same mtime and size THEN it is the kept map', async () => {
      const root = await newRoot('same stamp');
      const kept = await readCachedAtomResults(root, FILE);

      const again = await readCachedAtomResults(root, FILE);

      expect(again).toBe(kept);
    });

    it('WHEN read with another mtime THEN it is read again', async () => {
      const root = await newRoot('other mtime');
      const kept = await readCachedAtomResults(root, FILE);
      const later: RunSummaryFile = { ...FILE, mtimeMs: FILE.mtimeMs + 1 };

      const again = await readCachedAtomResults(root, later);

      expect(again).not.toBe(kept);
    });

    it('WHEN read with another size THEN it is read again', async () => {
      const root = await newRoot('other size');
      const kept = await readCachedAtomResults(root, FILE);
      const longer: RunSummaryFile = { ...FILE, size: FILE.size + 1 };

      const again = await readCachedAtomResults(root, longer);

      expect(again).not.toBe(kept);
    });

    it('WHEN the files of another root are dropped THEN it is still the kept map', async () => {
      const root = await newRoot('own root');
      const kept = await readCachedAtomResults(root, FILE);

      dropUnlistedAtomResults(join(tempDir, 'another root'), []);

      await expect(readCachedAtomResults(root, FILE)).resolves.toBe(kept);
    });

    it('WHEN dropped with a listing that names it THEN it is still the kept map', async () => {
      const root = await newRoot('listed');
      const kept = await readCachedAtomResults(root, FILE);

      dropUnlistedAtomResults(root, [FILE]);

      await expect(readCachedAtomResults(root, FILE)).resolves.toBe(kept);
    });

    it('WHEN dropped with a listing that lacks it THEN it is read again', async () => {
      const root = await newRoot('unlisted');
      const kept = await readCachedAtomResults(root, FILE);

      dropUnlistedAtomResults(root, [BROKEN]);

      await expect(readCachedAtomResults(root, FILE)).resolves.not.toBe(kept);
    });
  });

  describe('GIVEN a summary that is not JSON', () => {
    it('WHEN read THEN it is null', async () => {
      const root = await newRoot('broken');

      await expect(readCachedAtomResults(root, BROKEN)).resolves.toBeNull();
    });

    it('WHEN it is valid on the next read with the same mtime and size THEN it has its results', async () => {
      const root = await newRoot('mended');

      await readCachedAtomResults(root, BROKEN);
      await writeRun(root, BROKEN.name, TEXT, SECONDS);

      const mended = await readCachedAtomResults(root, BROKEN);

      expect(mended?.get('web#build')).toStrictEqual(BUILD);
    });
  });
});
