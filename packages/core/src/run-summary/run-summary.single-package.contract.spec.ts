import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { RunToMatch } from './common/run-match.type.ts';
import { matchRunSummary } from './domain-logic/match-run-summary.ts';
import { readNewestRunSummary } from './domain-logic/read-newest-run-summary.ts';
import { TASK_NODE_STUB } from './test/stubs/task-node.stub.ts';
import { turboRunAllArgs, turboRunArgs } from '../run-args/utils/run-args.util.ts';
import type { RunSummary, TurboResult } from '../shared/turbo/common/turbo.type.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import { SINGLE_PACKAGE_FILES_STUB } from '../shared/turbo/test/stubs/single-package-files.stub.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { writeUncommittedRepo } from '../shared/turbo/test/utils/uncommitted-repo.spec.util.ts';
import type { TaskNode } from '../workspace/common/workspace-model.type.ts';

const TURBO = devTurboPath();

const BUILD: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build', command: null };

describe('FEATURE: a run in a single-package repo against turbo 2.11.7', () => {
  let dir = '';
  let launchedAt = 0;
  let endedAt = 0;
  let result: TurboResult;
  let summary: RunSummary | null = null;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'run-summary-single-'));
    await writeUncommittedRepo(dir, SINGLE_PACKAGE_FILES_STUB);
    const args = turboRunArgs(BUILD, '//', { force: false }, true).slice(1);

    launchedAt = Date.now();
    result = await runTurbo(TURBO, args, dir);
    endedAt = Date.now();
    summary = await readNewestRunSummary(dir);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
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

    it('THEN matchRunSummary finds the run of //#build with a cache status', async () => {
      const run: RunToMatch = { task: BUILD, packageName: '//', launchedAt, endedAt, exitCode: result.exitCode };

      await expect(matchRunSummary(dir, run)).resolves.toMatchObject({ cache: 'MISS' });
    });
  });
});

describe('FEATURE: a run-all in a single-package repo against turbo 2.11.7', () => {
  let dir = '';
  let result: TurboResult;
  let summary: RunSummary | null = null;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'run-all-single-'));
    await writeUncommittedRepo(dir, SINGLE_PACKAGE_FILES_STUB);
    const runAllArgs = turboRunAllArgs('build', { affected: false }, true).slice(1);
    const args = [...runAllArgs, '--summarize'];

    result = await runTurbo(TURBO, args, dir);
    summary = await readNewestRunSummary(dir);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
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
