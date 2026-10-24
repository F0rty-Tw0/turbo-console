import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { readAtomResults } from './read-atom-results.ts';
import { runSummarySchema } from '../../shared/turbo/common/run-summary.schema.ts';
import type { RunSummary, RunSummaryTask } from '../../shared/turbo/common/turbo.type.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import type * as runSummaryFiles from '../data-access/run-summary-files.ts';
import { A, B, C, FILE_IDS, NEWEST_OF_ALL, OLDEST, WITHOUT_RUN_5 } from '../test/common/atom-results.const.ts';
import { readAtomFixture } from '../test/utils/atom-fixture.spec.util.ts';
import { writeAtomRuns } from '../test/utils/atom-runs.spec.util.ts';
import { newRunsRoot, summaryJson, taskEntry, writeRun } from '../test/utils/run-summary.spec.util.ts';

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

const FAR_FUTURE_SECONDS = 4_102_444_800;

const SLACK_INSIDE_SECONDS = 60;

const FILLER_COUNT = 20;

const WINDOW = { startTime: 1000, endTime: 2000 };

const RUN_3 = 'run-3-b-only';

const B_OF_RUN_3: AtomResult = { outcome: 'failed', durationMs: 1085, endedAt: 1792868568133 };

/** The task without its `cache` when it is B, so `runSummarySchema` rejects the whole summary. */
const withoutCacheOfB = (task: RunSummaryTask): Partial<RunSummaryTask> => {
  if (task.taskId !== B) return task;

  const { taskId, execution } = task;

  const stripped = { taskId, execution };

  return stripped;
};

/** The run 5 text with the `cache` of its B entry removed. */
const brokenRun5 = (text: string): string => {
  const json: unknown = JSON.parse(text);
  const summary = runSummarySchema.parse(json);
  const tasks = summary.tasks.map(withoutCacheOfB);
  const broken = { ...summary, tasks };

  return JSON.stringify(broken);
};

let tempDir = '';

describe('FEATURE: read atom results scanning', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'read-atom-results-scan-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    reads.count = 0;
  });

  describe('GIVEN five summaries and every id found in the newest', () => {
    it('WHEN one id is asked THEN it stops after one read', async () => {
      const root = await newRunsRoot(tempDir, 'stop early');
      const expected = new Map([[A, NEWEST_OF_ALL.get(A)]]);

      await writeAtomRuns(root, 5);

      await expect(readAtomResults(root, new Set([A]))).resolves.toStrictEqual(expected);
      expect(reads.count).toBe(1);
    });

    it('WHEN no id is asked THEN it reads nothing', async () => {
      const root = await newRunsRoot(tempDir, 'no ids');

      await writeAtomRuns(root, 5);

      await expect(readAtomResults(root, new Set())).resolves.toStrictEqual(new Map());
      expect(reads.count).toBe(0);
    });
  });

  describe('GIVEN an id that only the second summary holds', () => {
    it('WHEN it is asked THEN it reads the newer ones until it is found', async () => {
      const root = await newRunsRoot(tempDir, 'second');
      const expected = new Map([[C, WITHOUT_RUN_5.get(C)]]);

      await writeAtomRuns(root, 4);

      await expect(readAtomResults(root, new Set([C]))).resolves.toStrictEqual(expected);
      expect(reads.count).toBe(3);
    });
  });

  describe('GIVEN a summary dated far in the future', () => {
    it('WHEN read THEN it is not tried', async () => {
      const root = await newRunsRoot(tempDir, 'future');

      await writeAtomRuns(root, 5);
      await writeRun(root, 'future.json', readAtomFixture(RUN_3), FAR_FUTURE_SECONDS);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(NEWEST_OF_ALL);
    });
  });

  describe('GIVEN a summary dated a minute ahead, inside the slack', () => {
    it('WHEN read THEN it is the newest, so its B wins and run 5 fills the rest', async () => {
      const root = await newRunsRoot(tempDir, 'soon');
      const soonSeconds = Math.floor(Date.now() / 1000) + SLACK_INSIDE_SECONDS;
      const expected = new Map([...NEWEST_OF_ALL, [B, B_OF_RUN_3]]);

      await writeAtomRuns(root, 5);
      await writeRun(root, 'soon.json', readAtomFixture(RUN_3), soonSeconds);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(expected);
    });
  });

  describe('GIVEN the only holder of an id as the 21st newest summary', () => {
    it('WHEN read THEN the cap leaves it unread and the map is empty', async () => {
      const root = await newRunsRoot(tempDir, 'cap');
      const filler = summaryJson('turbo run build', WINDOW, 0, [taskEntry('@fx/lib#build', WINDOW, 'MISS')]);
      const seconds = Array.from({ length: FILLER_COUNT }, (_, index) => OLDEST + 20 + index);

      await writeAtomRuns(root, 1);

      for (const second of seconds) await writeRun(root, `filler-${second}.json`, filler, second);

      await expect(readAtomResults(root, new Set([C]))).resolves.toStrictEqual(new Map());
      expect(reads.count).toBe(FILLER_COUNT);
    });
  });

  describe('GIVEN the newest summary is not JSON', () => {
    it('WHEN read THEN it is skipped and older ones supply the results', async () => {
      const root = await newRunsRoot(tempDir, 'broken');

      await writeAtomRuns(root, 4);
      await writeRun(root, 'run-5.json', '{ not json', OLDEST + 50);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(WITHOUT_RUN_5);
    });
  });

  describe('GIVEN the newest summary has one entry that breaks the schema', () => {
    it('WHEN read THEN the whole summary is skipped, not salvaged entry by entry', async () => {
      const root = await newRunsRoot(tempDir, 'schema');
      const broken = brokenRun5(readAtomFixture('run-5-b-fixed'));

      await writeAtomRuns(root, 4);
      await writeRun(root, 'run-5.json', broken, OLDEST + 50);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(WITHOUT_RUN_5);
    });
  });
});
