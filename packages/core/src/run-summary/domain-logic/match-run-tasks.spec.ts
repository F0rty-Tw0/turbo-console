import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { matchRunTasks } from './match-run-tasks.ts';
import type { RunMatch, RunTasksMatch, RunToMatch, TaskOutcome } from '../common/run-match.type.ts';
import { SUMMARY_MTIME_SLACK_MS } from '../common/run-summary.const.ts';
import { TASK_NODE_STUB } from '../test/stubs/task-node.stub.ts';
import { cutShortOf, newRunsRoot, summaryJson, summaryOf, taskEntry, writeRun } from '../test/utils/run-summary.spec.util.ts';

/** Seconds since the epoch: the launch of `RUN` and the mtime of its own summary. */
const OLDEST = 1_760_000_000;

const LAUNCHED_AT = OLDEST * 1000;

const WINDOW = { startTime: LAUNCHED_AT + 1000, endTime: LAUNCHED_AT + 5000 };

const COMMAND = 'turbo run build --filter=web';

/** A run that ended with exit 1: the exit code of a run that failed in a dependency. */
const FAILED_RUN: RunToMatch = {
  task: TASK_NODE_STUB,
  packageName: 'web',
  launchedAt: LAUNCHED_AT,
  endedAt: LAUNCHED_AT + 10_000,
  exitCode: 1
};

const CLEAN_RUN: RunToMatch = { ...FAILED_RUN, exitCode: 0 };

const DEP_FAILED = summaryJson(COMMAND, WINDOW, 1, [taskEntry('ui#build', WINDOW, 'MISS', 3)]);

const FITTING_FAILED = summaryJson(COMMAND, WINDOW, 1, [
  taskEntry('ui#build', WINDOW, 'HIT'),
  taskEntry('web#build', WINDOW, 'MISS', 1)
]);

const OTHER = summaryJson('turbo run test --filter=web', WINDOW, 0, []);

const DEP_OUTCOMES: TaskOutcome[] = [{ taskId: 'ui#build', state: 'failed' }];

const FIT_MATCH: RunMatch = { cache: 'MISS', durationMs: 4000, interrupted: false };

const FIT_OUTCOMES: TaskOutcome[] = [
  { taskId: 'ui#build', state: 'passed' },
  { taskId: 'web#build', state: 'failed' }
];

const DEP_TASKS: RunTasksMatch = { match: null, outcomes: DEP_OUTCOMES };

const FIT_TASKS: RunTasksMatch = { match: FIT_MATCH, outcomes: FIT_OUTCOMES };

let tempDir = '';

let caseCount = 0;

/** A fresh workspace root with an empty `.turbo/runs`. */
const newRoot = async (): Promise<string> => {
  caseCount += 1;

  return newRunsRoot(tempDir, `case ${caseCount}`);
};

describe('FEATURE: match a run to the outcomes of its summary', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'match-run-tasks-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN one candidate without the launched task entry (its dependency failed)', () => {
    it('WHEN matched THEN there is no match but the outcome of every task it lists', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', DEP_FAILED, OLDEST);

      await expect(matchRunTasks(root, FAILED_RUN)).resolves.toStrictEqual(DEP_TASKS);
    });
  });

  describe('GIVEN that candidate next to a summary of another command', () => {
    it('WHEN matched THEN the other summary is no candidate, so the outcomes still come back', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', DEP_FAILED, OLDEST);
      await writeRun(root, 'b.json', OTHER, OLDEST + 1);

      await expect(matchRunTasks(root, FAILED_RUN)).resolves.toStrictEqual(DEP_TASKS);
    });
  });

  describe('GIVEN two candidates without the launched task entry', () => {
    it('WHEN matched THEN the run is ambiguous, so it is null', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', DEP_FAILED, OLDEST);
      await writeRun(root, 'b.json', DEP_FAILED, OLDEST + 1);

      await expect(matchRunTasks(root, FAILED_RUN)).resolves.toBeNull();
    });
  });

  describe('GIVEN a fitting and a non-fitting candidate', () => {
    it.each([
      ['newer', OLDEST, OLDEST + 1],
      ['older', OLDEST + 1, OLDEST]
    ])('WHEN the fitting one is %s THEN its match and outcomes come back', async (_age, fittingAt, nonFittingAt) => {
      const root = await newRoot();

      await writeRun(root, 'fitting.json', FITTING_FAILED, fittingAt);
      await writeRun(root, 'non-fitting.json', DEP_FAILED, nonFittingAt);

      await expect(matchRunTasks(root, FAILED_RUN)).resolves.toStrictEqual(FIT_TASKS);
    });
  });

  describe('GIVEN two fitting candidates', () => {
    it('WHEN matched THEN it is null, as matchRunSummary is', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', FITTING_FAILED, OLDEST);
      await writeRun(root, 'b.json', FITTING_FAILED, OLDEST + 1);

      await expect(matchRunTasks(root, FAILED_RUN)).resolves.toBeNull();
    });
  });

  describe('GIVEN a Ctrl+C summary (exit 0) that lists the ended ui#build and one attempted task more', () => {
    it('WHEN matched THEN the match is interrupted and the cut task has no outcome', async () => {
      const root = await newRoot();
      const summary = summaryOf(COMMAND, WINDOW, 0, [taskEntry('ui#build', WINDOW, 'HIT')]);
      const match: RunMatch = { cache: null, durationMs: 4000, interrupted: true };
      const outcomes: TaskOutcome[] = [{ taskId: 'ui#build', state: 'passed' }];
      const expected: RunTasksMatch = { match, outcomes };

      await writeRun(root, 'a.json', JSON.stringify(cutShortOf(summary)), OLDEST);

      await expect(matchRunTasks(root, CLEAN_RUN)).resolves.toStrictEqual(expected);
    });
  });

  describe('GIVEN a Ctrl+C summary before any task ended', () => {
    it('WHEN matched THEN the outcomes are an empty list, not null', async () => {
      const root = await newRoot();
      const summary = cutShortOf(summaryOf(COMMAND, WINDOW, 0, []));
      const match: RunMatch = { cache: null, durationMs: 4000, interrupted: true };
      const expected: RunTasksMatch = { match, outcomes: [] };

      await writeRun(root, 'a.json', JSON.stringify(summary), OLDEST);

      await expect(matchRunTasks(root, CLEAN_RUN)).resolves.toStrictEqual(expected);
    });
  });

  describe('GIVEN a root with no .turbo/runs', () => {
    it('WHEN matched THEN it is null', async () => {
      const root = join(tempDir, 'no runs');

      await mkdir(root);

      await expect(matchRunTasks(root, FAILED_RUN)).resolves.toBeNull();
    });
  });

  describe('GIVEN one non-fitting candidate written 1 s further off than the slack', () => {
    it('WHEN matched THEN it is not near the run, so it is null', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', DEP_FAILED, OLDEST - SUMMARY_MTIME_SLACK_MS / 1000 - 1);

      await expect(matchRunTasks(root, FAILED_RUN)).resolves.toBeNull();
    });
  });
});
