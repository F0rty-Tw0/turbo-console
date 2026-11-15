import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { readAtomResults } from './read-atom-results.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import { MAX_SUMMARY_TRIES } from '../common/run-summary.const.ts';
import type * as runSummaryFiles from '../data-access/run-summary-files.ts';
import { A, B, FILE_IDS, NEWEST_OF_ALL, OLDEST, WITHOUT_RUN_5 } from '../test/common/atom-results.const.ts';
import type { RunWindow } from '../test/common/run-window.type.ts';
import { writeAtomRuns } from '../test/utils/atom-runs.spec.util.ts';
import { newRunsRoot, runsDirOf, summaryJson, taskEntry, writeRun } from '../test/utils/run-summary.spec.util.ts';

const reads = vi.hoisted(() => {
  const state = { count: 0 };

  return state;
});

vi.mock('../data-access/run-summary-files.ts', async (importOriginal) => {
  const real = await importOriginal<typeof runSummaryFiles>();

  /** The real read, counted. */
  const readRunSummaryFile = async (root: string, name: string): Promise<RunSummary | null> => {
    reads.count += 1;

    return real.readRunSummaryFile(root, name);
  };

  const mocked = { ...real, readRunSummaryFile };

  return mocked;
});

const ID = '@fx/e2e#e2e-ci--tests/a.spec.ts';

const WANTED = new Set([ID]);

const NAME = 'run.json';

const FIRST: RunWindow = { startTime: 1000, endTime: 2000 };

/** As long as `FIRST` in JSON, so a summary of either has the same size. */
const SECOND: RunWindow = { startTime: 1000, endTime: 3000 };

const FIRST_TEXT = summaryJson('turbo run e2e-ci', FIRST, 0, [taskEntry(ID, FIRST, 'MISS')]);

const SECOND_TEXT = summaryJson('turbo run e2e-ci', SECOND, 0, [taskEntry(ID, SECOND, 'MISS')]);

/** One character shorter than `FIRST_TEXT`: `HIT` for `MISS`. */
const HIT_TEXT = summaryJson('turbo run e2e-ci', FIRST, 0, [taskEntry(ID, FIRST, 'HIT')]);

/** As long as `FIRST_TEXT`, and not JSON. */
const BROKEN_TEXT = `${FIRST_TEXT.slice(0, -1)} `;

const OTHER_TEXT = summaryJson('turbo run build', FIRST, 0, [taskEntry('@fx/lib#build', FIRST, 'MISS')]);

const FIRST_RESULT: AtomResult = { outcome: 'passed', durationMs: 1000, endedAt: 2000 };

const SECOND_RESULT: AtomResult = { outcome: 'passed', durationMs: 2000, endedAt: 3000 };

const HIT_RESULT: AtomResult = { outcome: 'cached', durationMs: 1000, endedAt: 2000 };

const AT = OLDEST + 10;

let tempDir = '';

describe('FEATURE: read atom results caching', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'read-atom-results-cache-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN four summaries read once', () => {
    it('WHEN read again unchanged THEN no summary is read and the map is the same', async () => {
      const root = await newRunsRoot(tempDir, 'unchanged');

      await writeAtomRuns(root, 4);
      await readAtomResults(root, FILE_IDS);
      reads.count = 0;

      const again = await readAtomResults(root, FILE_IDS);

      expect(again).toStrictEqual(WITHOUT_RUN_5);
      expect(reads.count).toBe(0);
    });
  });

  describe('GIVEN five summaries where one id was read from the newest', () => {
    it('WHEN another id of that summary is asked THEN the cache answers, since it holds every task of the file', async () => {
      const root = await newRunsRoot(tempDir, 'other id');
      const expected = new Map([[B, NEWEST_OF_ALL.get(B)]]);

      await writeAtomRuns(root, 5);
      await readAtomResults(root, new Set([A]));
      reads.count = 0;

      const again = await readAtomResults(root, new Set([B]));

      expect(again).toStrictEqual(expected);
      expect(reads.count).toBe(0);
    });
  });

  describe('GIVEN a summary read once, then rewritten', () => {
    it('WHEN its mtime changed and its size did not THEN it is read again and the new result wins', async () => {
      const root = await newRunsRoot(tempDir, 'new mtime');

      await writeRun(root, NAME, FIRST_TEXT, AT);
      await readAtomResults(root, WANTED);
      await writeRun(root, NAME, SECOND_TEXT, AT + 1);
      reads.count = 0;

      const again = await readAtomResults(root, WANTED);

      expect(again).toStrictEqual(new Map([[ID, SECOND_RESULT]]));
      expect(reads.count).toBe(1);
    });

    it('WHEN its size changed and its mtime did not THEN it is read again and the new result wins', async () => {
      const root = await newRunsRoot(tempDir, 'new size');

      await writeRun(root, NAME, FIRST_TEXT, AT);
      await readAtomResults(root, WANTED);
      await writeRun(root, NAME, HIT_TEXT, AT);
      reads.count = 0;

      const again = await readAtomResults(root, WANTED);

      expect(again).toStrictEqual(new Map([[ID, HIT_RESULT]]));
      expect(reads.count).toBe(1);
    });
  });

  describe('GIVEN a summary that was not JSON when first read', () => {
    it('WHEN it is valid with the same mtime and size THEN it is read and supplies its result', async () => {
      const root = await newRunsRoot(tempDir, 'half written');

      await writeRun(root, NAME, BROKEN_TEXT, AT);
      await readAtomResults(root, WANTED);
      await writeRun(root, NAME, FIRST_TEXT, AT);
      reads.count = 0;

      const again = await readAtomResults(root, WANTED);

      expect(again).toStrictEqual(new Map([[ID, FIRST_RESULT]]));
      expect(reads.count).toBe(1);
    });
  });

  describe('GIVEN a summary read once, then deleted', () => {
    it('WHEN read THEN its results are gone', async () => {
      const root = await newRunsRoot(tempDir, 'deleted');

      await writeRun(root, NAME, FIRST_TEXT, AT);
      await readAtomResults(root, WANTED);
      await rm(join(runsDirOf(root), NAME));

      await expect(readAtomResults(root, WANTED)).resolves.toStrictEqual(new Map());
    });

    it('WHEN it is back with the same mtime and size THEN no cached entry answers: it is read again', async () => {
      const root = await newRunsRoot(tempDir, 'deleted and back');

      await writeRun(root, NAME, FIRST_TEXT, AT);
      await readAtomResults(root, WANTED);
      await rm(join(runsDirOf(root), NAME));
      await readAtomResults(root, WANTED);
      await writeRun(root, NAME, SECOND_TEXT, AT);
      reads.count = 0;

      const again = await readAtomResults(root, WANTED);

      expect(again).toStrictEqual(new Map([[ID, SECOND_RESULT]]));
      expect(reads.count).toBe(1);
    });
  });

  describe('GIVEN a runs directory read once, then removed', () => {
    it('WHEN it is back with the same file THEN no cached entry answers: it is read again', async () => {
      const dirName = 'no runs and back';
      const root = await newRunsRoot(tempDir, dirName);

      await writeRun(root, NAME, FIRST_TEXT, AT);
      await readAtomResults(root, WANTED);
      await rm(runsDirOf(root), { recursive: true });
      await readAtomResults(root, WANTED);
      await newRunsRoot(tempDir, dirName);
      await writeRun(root, NAME, SECOND_TEXT, AT);
      reads.count = 0;

      const again = await readAtomResults(root, WANTED);

      expect(again).toStrictEqual(new Map([[ID, SECOND_RESULT]]));
      expect(reads.count).toBe(1);
    });
  });

  describe(`GIVEN ${MAX_SUMMARY_TRIES} summaries read once, then pushed out of the newest ${MAX_SUMMARY_TRIES}`, () => {
    it('WHEN the newer ones are gone THEN the cache kept none of the first: every one is read again', async () => {
      const root = await newRunsRoot(tempDir, 'pushed out');
      const offsets = Array.from({ length: MAX_SUMMARY_TRIES }, (_, index) => index);
      const older = offsets.map(async (offset) => writeRun(root, `older-${offset}.json`, OTHER_TEXT, AT + offset));

      await Promise.all(older);
      await readAtomResults(root, WANTED);

      const newer = offsets.map(async (offset) => writeRun(root, `newer-${offset}.json`, OTHER_TEXT, AT + 100 + offset));

      await Promise.all(newer);
      await readAtomResults(root, WANTED);

      const removed = offsets.map(async (offset) => rm(join(runsDirOf(root), `newer-${offset}.json`)));

      await Promise.all(removed);
      reads.count = 0;

      const again = await readAtomResults(root, WANTED);

      expect(again).toStrictEqual(new Map());
      expect(reads.count).toBe(MAX_SUMMARY_TRIES);
    });
  });
});
