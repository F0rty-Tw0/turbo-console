import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { RunToMatch } from './common/run-match.type.ts';
import { matchRunTasks } from './domain-logic/match-run-tasks.ts';
import { readNewestRunSummary } from './domain-logic/read-newest-run-summary.ts';
import { TASK_NODE_STUB } from './test/stubs/task-node.stub.ts';
import { runMatchOf } from './test/utils/run-match.spec.util.ts';
import { turboRunAllArgs, turboRunArgs } from '../run-args/utils/run-args.util.ts';
import type { RunSummary, TurboResult } from '../shared/turbo/common/turbo.type.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import type { SinglePackageRepo } from '../shared/turbo/test/common/turbo.type.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { singlePackageRepo } from '../shared/turbo/test/utils/single-package-repo.spec.util.ts';
import type { TaskNode } from '../workspace/common/workspace-model.type.ts';

const TURBO = devTurboPath();

const BUILD: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build', command: null };

describe('FEATURE: a run in a single-package repo against turbo 2.11.7', () => {
  let repo: SinglePackageRepo | undefined;
  let dir = '';
  let launchedAt = 0;
  let endedAt = 0;
  let result: TurboResult;
  let summary: RunSummary | null = null;

  beforeAll(async () => {
    repo = await singlePackageRepo('run-summary-single-');
    dir = repo.dir;
    const args = turboRunArgs(BUILD, '//', { force: false }, true).slice(1);

    launchedAt = Date.now();
    result = await runTurbo(TURBO, args, dir);
    endedAt = Date.now();
    summary = await readNewestRunSummary(dir);
  });

  afterAll(async () => {
    await repo?.dispose();
  });

  describe('GIVEN an uncommitted single-package repo built once', () => {
    it('THEN turbo exits 0 and the summary command is exactly turbo run build --filter=//', () => {
      expect(result.exitCode).toBe(0);
      expect(summary?.execution.command).toBe('turbo run build --filter=//');
    });

    it('THEN the summary says monorepo false and its task id was rewritten to //#build', () => {
      expect(summary?.monorepo).toBe(false);
      expect(summary?.tasks.map((task) => task.taskId)).toStrictEqual(['//#build']);
    });

    it('THEN matchRunTasks finds the run of //#build with a cache status', async () => {
      const run: RunToMatch = { task: BUILD, packageName: '//', launchedAt, endedAt, exitCode: result.exitCode };

      const tasksMatch = await matchRunTasks(dir, run);

      expect(runMatchOf(tasksMatch)).toMatchObject({ cache: 'MISS' });
    });
  });
});

describe('FEATURE: a run-all in a single-package repo against turbo 2.11.7', () => {
  let repo: SinglePackageRepo | undefined;
  let dir = '';
  let result: TurboResult;
  let summary: RunSummary | null = null;

  beforeAll(async () => {
    repo = await singlePackageRepo('run-all-single-');
    dir = repo.dir;
    const runAllArgs = turboRunAllArgs('build', { affected: false }, true).slice(1);
    const args = [...runAllArgs, '--summarize'];

    result = await runTurbo(TURBO, args, dir);
    summary = await readNewestRunSummary(dir);
  });

  afterAll(async () => {
    await repo?.dispose();
  });

  describe('GIVEN an uncommitted single-package repo built once with turboRunAllArgs and --single-package', () => {
    it('THEN turbo exits 0 and the summary command is exactly turbo run build', () => {
      expect(result.exitCode).toBe(0);
      expect(summary?.execution.command).toBe('turbo run build');
    });

    it('THEN the summary says monorepo false and lists //#build', () => {
      expect(summary?.monorepo).toBe(false);
      expect(summary?.tasks.map((task) => task.taskId)).toStrictEqual(['//#build']);
    });
  });
});
