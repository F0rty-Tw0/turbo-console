import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { matchRunSummary } from './match-run-summary.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';
import type { RunToMatch } from '../common/run-match.type.ts';
import { MAX_SUMMARY_TRIES, SUMMARY_MTIME_SLACK_MS } from '../common/run-summary.const.ts';
import { TASK_NODE_STUB } from '../test/stubs/task-node.stub.ts';
import { newRunsRoot, runsDirOf, summaryJson, taskEntry, writeRun } from '../test/utils/run-summary.spec.util.ts';

/** chmod has no effect on Windows, and root reads any directory. */
const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

/** Symlinks without extra privileges are POSIX only. */
const IS_POSIX = process.platform !== 'win32';

/** Seconds since the epoch: the launch of `RUN` and the mtime of its own summary. */
const OLDEST = 1_760_000_000;

/** 2100-01-01 in seconds since the epoch: far past any run. */
const FUTURE = 4_102_444_800;

const LAUNCHED_AT = OLDEST * 1000;

const WINDOW = { startTime: LAUNCHED_AT + 1000, endTime: LAUNCHED_AT + 5000 };

const COMMAND = 'turbo run build --filter=web';

/** `RUN` lasts 10 s, so with the 10 min slack its summaries count from `OLDEST - 600` to `OLDEST + 610`. */
const RUN: RunToMatch = {
  task: TASK_NODE_STUB,
  packageName: 'web',
  launchedAt: LAUNCHED_AT,
  endedAt: LAUNCHED_AT + 10_000,
  exitCode: 0
};

const MATCHING = summaryJson(COMMAND, WINDOW, 0, [taskEntry('web#build', WINDOW, 'HIT')]);

const OTHER = summaryJson('turbo run test --filter=web', WINDOW, 0, []);

const EXPECTED = { cache: 'HIT', durationMs: 4000 };

/** `count` mtimes after `OLDEST`, half a second apart, all within the window of `RUN`. */
const newerTimes = (count: number): number[] => Array.from({ length: count }, (_, index) => OLDEST + (index + 1) / 2);

let tempDir = '';

let caseCount = 0;

/** A fresh workspace root with an empty `.turbo/runs`. */
const newRoot = async (): Promise<string> => {
  caseCount += 1;

  return newRunsRoot(tempDir, `case ${caseCount}`);
};

describe('FEATURE: match a run to its summary', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'match-run-summary-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a root with no .turbo/runs', () => {
    it('WHEN matched THEN it is null', async () => {
      const root = join(tempDir, 'no runs');

      await mkdir(root);

      await expect(matchRunSummary(root, RUN)).resolves.toBeNull();
    });
  });

  describe('GIVEN a runs directory with one matching summary', () => {
    it('WHEN matched THEN the match comes back', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', MATCHING, OLDEST);

      await expect(matchRunSummary(root, RUN)).resolves.toStrictEqual(EXPECTED);
    });
  });

  describe('GIVEN a matching summary next to one of another command', () => {
    it('WHEN matched THEN the matching one is used', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', MATCHING, OLDEST);
      await writeRun(root, 'b.json', OTHER, OLDEST + 1);

      await expect(matchRunSummary(root, RUN)).resolves.toStrictEqual(EXPECTED);
    });
  });

  describe('GIVEN two summaries that both fit the run', () => {
    it('WHEN matched THEN the run is ambiguous, so it is null', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', MATCHING, OLDEST);
      await writeRun(root, 'b.json', MATCHING, OLDEST + 1);

      await expect(matchRunSummary(root, RUN)).resolves.toBeNull();
    });
  });

  describe('GIVEN two overlapping runs whose summaries both list lib#build (spec §4.5)', () => {
    const appSummary = summaryJson('turbo run build --filter=app', WINDOW, 0, [
      taskEntry('app#build', { startTime: WINDOW.startTime, endTime: WINDOW.startTime + 100 }, 'MISS'),
      taskEntry('lib#build', { startTime: WINDOW.startTime, endTime: WINDOW.startTime + 5 }, 'HIT')
    ]);
    const libSummary = summaryJson('turbo run build --filter=lib', WINDOW, 0, [
      taskEntry('lib#build', { startTime: WINDOW.startTime, endTime: WINDOW.startTime + 700 }, 'MISS')
    ]);
    const appTask: TaskNode = { ...TASK_NODE_STUB, id: 'app#build' };
    const libTask: TaskNode = { ...TASK_NODE_STUB, id: 'lib#build' };
    const appRun: RunToMatch = { ...RUN, task: appTask, packageName: 'app' };
    const libRun: RunToMatch = { ...RUN, task: libTask, packageName: 'lib' };
    let root = '';

    beforeAll(async () => {
      root = await newRoot();

      await writeRun(root, 'app.json', appSummary, OLDEST);
      await writeRun(root, 'lib.json', libSummary, OLDEST + 1);
    });

    it('WHEN the app run is matched THEN it gets the app summary data', async () => {
      await expect(matchRunSummary(root, appRun)).resolves.toStrictEqual({ cache: 'MISS', durationMs: 100 });
    });

    it('WHEN the lib run is matched THEN it gets the lib summary data, not the dependency entry of the app one', async () => {
      await expect(matchRunSummary(root, libRun)).resolves.toStrictEqual({ cache: 'MISS', durationMs: 700 });
    });
  });

  describe('GIVEN a matching summary written outside the mtime window of the run', () => {
    it('WHEN it is 1 s further off than the slack THEN it is not considered, so it is null', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', MATCHING, OLDEST - SUMMARY_MTIME_SLACK_MS / 1000 - 1);

      await expect(matchRunSummary(root, RUN)).resolves.toBeNull();
    });
  });

  describe('GIVEN a matching summary whose mtime is 90 s off the run window, as with a skewed filesystem clock', () => {
    it('WHEN matched THEN it still matches', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', MATCHING, OLDEST - 90);

      await expect(matchRunSummary(root, RUN)).resolves.toStrictEqual(EXPECTED);
    });
  });

  describe(`GIVEN ${MAX_SUMMARY_TRIES} future-dated files and the matching summary within the window`, () => {
    it('WHEN matched THEN the future files do not take the window, so the match comes back', async () => {
      const root = await newRoot();
      const futureTimes = Array.from({ length: MAX_SUMMARY_TRIES }, (_, index) => FUTURE + index);

      await writeRun(root, 'match.json', MATCHING, OLDEST);

      for (const seconds of futureTimes) await writeRun(root, `future-${seconds}.json`, MATCHING, seconds);

      await expect(matchRunSummary(root, RUN)).resolves.toStrictEqual(EXPECTED);
    });
  });

  describe(`GIVEN a matching summary that is only the ${MAX_SUMMARY_TRIES + 1}st newest, all within the window`, () => {
    it('WHEN matched THEN it is out of reach, so it is null', async () => {
      const root = await newRoot();

      await writeRun(root, 'match.json', MATCHING, OLDEST);

      for (const [index, seconds] of newerTimes(MAX_SUMMARY_TRIES).entries())
        await writeRun(root, `other-${index}.json`, OTHER, seconds);

      await expect(matchRunSummary(root, RUN)).resolves.toBeNull();
    });
  });

  describe('GIVEN a matching summary next to a fitting one whose task entry ends before it starts', () => {
    it('WHEN matched THEN the bad one is no candidate, so the good one matches', async () => {
      const root = await newRoot();
      const backwards = taskEntry('web#build', { startTime: WINDOW.endTime, endTime: WINDOW.startTime }, 'HIT');

      await writeRun(root, 'a.json', MATCHING, OLDEST);
      await writeRun(root, 'b.json', summaryJson(COMMAND, WINDOW, 0, [backwards]), OLDEST + 1);

      await expect(matchRunSummary(root, RUN)).resolves.toStrictEqual(EXPECTED);
    });
  });

  describe('GIVEN a newer file that is not JSON', () => {
    it('WHEN matched THEN it is dropped and the older matching summary is used', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', MATCHING, OLDEST);
      await writeRun(root, 'b.json', '{', OLDEST + 1);

      await expect(matchRunSummary(root, RUN)).resolves.toStrictEqual(EXPECTED);
    });
  });

  describe.skipIf(!IS_POSIX)('GIVEN a matching summary that is a symlink to a file outside the root', () => {
    it('WHEN matched THEN the listing drops the symlink, so it is null', async () => {
      const root = await newRoot();
      const outside = join(tempDir, 'outside.json');

      await writeFile(outside, MATCHING);
      await symlink(outside, join(runsDirOf(root), 'a.json'));

      await expect(matchRunSummary(root, RUN)).resolves.toBeNull();
    });
  });

  describe.skipIf(!CAN_DENY_READ)('GIVEN a .turbo/runs that cannot be read', () => {
    it('WHEN matched THEN it rejects io naming the directory and EACCES', async () => {
      const root = await newRoot();
      const runs = runsDirOf(root);

      await chmod(runs, 0o000);

      try {
        const matching = matchRunSummary(root, RUN);

        await expect(matching).rejects.toBeInstanceOf(TurboException);
        await expect(matching).rejects.toMatchObject({ kind: 'io', message: `${runs}: EACCES` });
      } finally {
        await chmod(runs, 0o700);
      }
    });
  });
});
