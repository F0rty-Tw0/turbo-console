import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { RunMatch, RunTasksMatch, RunToMatch, TaskOutcome } from './common/run-match.type.ts';
import { matchRunTasks } from './domain-logic/match-run-tasks.ts';
import { readNewestRunSummary } from './domain-logic/read-newest-run-summary.ts';
import { TASK_NODE_STUB } from './test/stubs/task-node.stub.ts';
import {
  DEPENDENT_NAME,
  FAILING_NAME,
  SCRIPTS_ANCHOR,
  TASKS_ANCHOR,
  addFailTasks,
  insertMember
} from './test/utils/fail-fixture.spec.util.ts';
import { runMatchOf } from './test/utils/run-match.spec.util.ts';
import { runCommandOf } from './utils/run-match.util.ts';
import type { RunExtras } from '../run-args/common/run-args.type.ts';
import { turboRunArgs } from '../run-args/utils/run-args.util.ts';
import type { RunSummary } from '../shared/turbo/common/turbo.type.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import { SINGLE_PACKAGE_FILES_STUB } from '../shared/turbo/test/stubs/single-package-files.stub.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';
import { leafPackage } from '../shared/turbo/test/utils/manifest.spec.util.ts';
import { writeUncommittedRepo } from '../shared/turbo/test/utils/uncommitted-repo.spec.util.ts';
import type { TaskNode } from '../workspace/common/workspace-model.type.ts';

const TURBO = devTurboPath();

const TARGET_LIKE = PRESETS['target-like'];

/** A task whose script is `node echo-args.js`, a file that ignores its arguments and exits 0. */
const ECHO_NAME = 'echo-args';

const ONLY: RunExtras = { only: true };

const CONTINUE: RunExtras = { continueMode: 'dependencies-successful' };

const CONCURRENCY_2: RunExtras = { concurrency: '2' };

const CONCURRENCY_50_PERCENT: RunExtras = { concurrency: '50%' };

const PASS_THROUGH_EQUALS: RunExtras = { passThrough: ['--watch', '--port=3000'] };

const PASS_THROUGH_SEPARATE: RunExtras = { passThrough: ['--watch', '--port', '3000', './src/a.ts'] };

const ALL_TOGETHER: RunExtras = {
  only: true,
  continueMode: 'dependencies-successful',
  concurrency: '2',
  passThrough: ['--watch', '--port=3000']
};

type LaunchSpec = {
  readonly dir: string;
  readonly task: TaskNode;
  readonly packageName: string;
  readonly force: boolean;
  readonly extras: RunExtras;
  readonly singlePackage: boolean;
};

type Launched = {
  readonly run: RunToMatch;
  readonly tasksMatch: RunTasksMatch | null;
  readonly summary: RunSummary | null;
};

type RecordedRow = {
  readonly label: string;
  readonly force: boolean;
  readonly extras: RunExtras;
  readonly suffix: string;
};

/** What turbo records after `turbo run echo-args --filter=<leaf>` for each way of asking (P8). */
const RECORDED: RecordedRow[] = [
  { label: 'none', force: false, extras: {}, suffix: '' },
  { label: 'force alone', force: true, extras: {}, suffix: '' },
  { label: 'only', force: false, extras: ONLY, suffix: ' --only' },
  { label: 'continue', force: false, extras: CONTINUE, suffix: ' --continue=dependencies-successful' },
  { label: 'concurrency 2', force: false, extras: CONCURRENCY_2, suffix: '' },
  { label: 'concurrency 50%', force: false, extras: CONCURRENCY_50_PERCENT, suffix: '' },
  { label: 'pass-through with =', force: false, extras: PASS_THROUGH_EQUALS, suffix: ' -- --watch --port=3000' },
  {
    label: 'separate value and positional',
    force: false,
    extras: PASS_THROUGH_SEPARATE,
    suffix: ' -- --watch --port 3000 ./src/a.ts'
  },
  {
    label: 'all together',
    force: true,
    extras: ALL_TOGETHER,
    suffix: ' --continue=dependencies-successful --only -- --watch --port=3000'
  }
];

/** Runs one task with the options between two clock reads, then reads its match and the newest summary. */
const launchOf = async (spec: LaunchSpec): Promise<Launched> => {
  const { dir, task, packageName, force, extras, singlePackage } = spec;
  const args = turboRunArgs(task, packageName, { force, ...extras }, singlePackage).slice(1);
  const launchedAt = Date.now();
  // No --log-order=stream: appended after `--` it would become a pass-through arg and land in the recorded command.
  const result = await runTurbo(TURBO, args, dir);
  const run: RunToMatch = { task, packageName, launchedAt, endedAt: Date.now(), exitCode: result.exitCode, extras };
  const tasksMatch = await matchRunTasks(dir, run);
  const summary = await readNewestRunSummary(dir);
  const launched: Launched = { run, tasksMatch, summary };

  return launched;
};

const taskOf = (packageName: string, name: string): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${packageName}#${name}`, name, command: null };

  return task;
};

const taskIdsOf = (launched: Launched | null): string[] | undefined => launched?.summary?.tasks.map((task) => task.taskId);

const matchOf = (launched: Launched | null): RunMatch | null => {
  if (launched === null) return null;

  return runMatchOf(launched.tasksMatch);
};

const recordedCommandOf = (launched: Launched | null): string => {
  if (launched === null) return '';

  return runCommandOf(launched.run);
};

describe('FEATURE: run options against turbo 2.11.7 (target-like fixture)', () => {
  const fixture = fixtureHook(TARGET_LIKE);

  beforeAll(async () => {
    const { dir, manifest } = fixture();
    const leaf = leafPackage(manifest);

    await addFailTasks(dir, leaf.path);
    await insertMember(join(dir, 'turbo.json'), TASKS_ANCHOR, `    "${ECHO_NAME}": {}`);
    await insertMember(join(dir, leaf.path, 'package.json'), SCRIPTS_ANCHOR, `    "${ECHO_NAME}": "node ${ECHO_NAME}.js"`);
    await writeFile(join(dir, leaf.path, `${ECHO_NAME}.js`), '// ignores its arguments\n');
  });

  const launchLeaf = async (name: string, force: boolean, extras: RunExtras): Promise<Launched> => {
    const { dir, manifest } = fixture();
    const leaf = leafPackage(manifest);
    const task = taskOf(leaf.name, name);
    const launched = await launchOf({ dir, task, packageName: leaf.name, force, extras, singlePackage: false });

    return launched;
  };

  describe(`GIVEN ${DEPENDENT_NAME} runs with only`, () => {
    let launched: Launched | null = null;

    beforeAll(async () => {
      launched = await launchLeaf(DEPENDENT_NAME, false, ONLY);
    });

    it(`THEN turbo exits 0 and runs ${DEPENDENT_NAME} alone, without ${FAILING_NAME}`, () => {
      const leafName = leafPackage(fixture().manifest).name;

      expect(launched?.run.exitCode).toBe(0);
      expect(taskIdsOf(launched)).toStrictEqual([`${leafName}#${DEPENDENT_NAME}`]);
    });

    it('THEN the run matches its summary as a cache MISS with a duration', () => {
      const match = matchOf(launched);

      expect(match).toMatchObject({ cache: 'MISS', interrupted: false });
      expect(match?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe(`GIVEN ${DEPENDENT_NAME} runs with continueMode dependencies-successful`, () => {
    let launched: Launched | null = null;

    beforeAll(async () => {
      launched = await launchLeaf(DEPENDENT_NAME, false, CONTINUE);
    });

    it(`THEN turbo exits 3 and the summary lists ${FAILING_NAME} but not ${DEPENDENT_NAME}`, () => {
      const leafName = leafPackage(fixture().manifest).name;

      expect(launched?.run.exitCode).toBe(3);
      expect(taskIdsOf(launched)).toContain(`${leafName}#${FAILING_NAME}`);
      expect(taskIdsOf(launched)).not.toContain(`${leafName}#${DEPENDENT_NAME}`);
    });

    it(`THEN matchRunTasks has no match and keeps ${FAILING_NAME} as failed`, () => {
      const leafName = leafPackage(fixture().manifest).name;
      const failedOutcome: TaskOutcome = { taskId: `${leafName}#${FAILING_NAME}`, state: 'failed' };

      expect(launched?.tasksMatch).toStrictEqual({ match: null, outcomes: [failedOutcome] });
    });
  });

  describe.each(RECORDED)('GIVEN $label', ({ force, extras, suffix }) => {
    let launched: Launched | null = null;

    beforeAll(async () => {
      launched = await launchLeaf(ECHO_NAME, force, extras);
    });

    it('THEN the summary records the command with only the words turbo writes', () => {
      const leafName = leafPackage(fixture().manifest).name;

      expect(launched?.summary?.execution.command).toBe(`turbo run ${ECHO_NAME} --filter=${leafName}${suffix}`);
    });

    it('THEN runCommandOf gives that same command', () => {
      expect(launched?.summary?.execution.command).toBe(recordedCommandOf(launched));
    });

    it('THEN the run matches its summary', () => {
      expect(matchOf(launched)).not.toBeNull();
    });
  });
});

describe('FEATURE: run options in a single-package repo against turbo 2.11.7', () => {
  let dir = '';
  let launched: Launched | null = null;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'run-options-single-'));
    await writeUncommittedRepo(dir, SINGLE_PACKAGE_FILES_STUB);
    const extras: RunExtras = { only: true, continueMode: 'dependencies-successful', passThrough: ['--watch'] };
    const task = taskOf('//', 'build');

    launched = await launchOf({ dir, task, packageName: '//', force: false, extras, singlePackage: true });
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN //#build runs with only, continueMode and a pass-through arg', () => {
    it('THEN the summary records them in turbo order', () => {
      const command = 'turbo run build --filter=// --continue=dependencies-successful --only -- --watch';

      expect(launched?.summary?.execution.command).toBe(command);
    });

    it('THEN runCommandOf gives that same command', () => {
      expect(launched?.summary?.execution.command).toBe(recordedCommandOf(launched));
    });
  });
});
