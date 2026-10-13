import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { matchRunSummary } from './match-run-summary.ts';
import type { RunToMatch } from '../common/run-match.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import type * as runSummaryFiles from '../data-access/run-summary-files.ts';
import { TASK_NODE_STUB } from '../test/stubs/task-node.stub.ts';
import { newRunsRoot, runsDirOf, summaryJson, taskEntry, writeRun } from '../test/utils/run-summary.spec.util.ts';

const listing = vi.hoisted(() => {
  const proceed = async (): Promise<void> => Promise.resolve();
  const afterList: () => Promise<void> = proceed;
  const state = { afterList };

  return state;
});

vi.mock('../data-access/run-summary-files.ts', async (importOriginal) => {
  const real = await importOriginal<typeof runSummaryFiles>();

  /** The real listing, then `listing.afterList`, so a case can change the directory between listing and reading. */
  const listRunSummaryFiles = async (root: string): Promise<RunSummaryFile[] | null> => {
    const files = await real.listRunSummaryFiles(root);

    await listing.afterList();

    return files;
  };

  const mocked = { ...real, listRunSummaryFiles };

  return mocked;
});

/** Seconds since the epoch: the launch of `RUN` and the mtime of its own summary. */
const OLDEST = 1_760_000_000;

const LAUNCHED_AT = OLDEST * 1000;

const WINDOW = { startTime: LAUNCHED_AT + 1000, endTime: LAUNCHED_AT + 5000 };

const COMMAND = 'turbo run build --filter=web';

const RUN: RunToMatch = {
  task: TASK_NODE_STUB,
  packageName: 'web',
  launchedAt: LAUNCHED_AT,
  endedAt: LAUNCHED_AT + 10_000,
  exitCode: 0
};

const MATCHING = summaryJson(COMMAND, WINDOW, 0, [taskEntry('web#build', WINDOW, 'HIT')]);

let tempDir = '';

describe('FEATURE: match a run to its summary while files vanish', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'match-run-summary-vanish-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a newer summary deleted between listing and reading, and a matching one that stays', () => {
    it('WHEN matched THEN the deleted one is skipped without a throw, so the one that stays matches', async () => {
      const root = await newRunsRoot(tempDir, 'vanish');
      const gone = join(runsDirOf(root), 'gone.json');

      await writeRun(root, 'stays.json', MATCHING, OLDEST);
      await writeRun(root, 'gone.json', MATCHING, OLDEST + 1);

      listing.afterList = async (): Promise<void> => rm(gone);

      await expect(matchRunSummary(root, RUN)).resolves.toStrictEqual({ cache: 'HIT', durationMs: 4000 });
    });
  });
});
