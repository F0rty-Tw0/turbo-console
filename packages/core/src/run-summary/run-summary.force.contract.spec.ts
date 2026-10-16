import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { commitBaseRepo } from '@turbo-console/repo-gen';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { RunMatch, RunToMatch } from './common/run-match.type.ts';
import { matchRunSummary } from './domain-logic/match-run-summary.ts';
import { readNewestRunSummary } from './domain-logic/read-newest-run-summary.ts';
import { FORCE_FIXTURE_FILES_STUB, FORCE_PACKAGE_STUB } from './test/stubs/force-fixture.stub.ts';
import { TASK_NODE_STUB } from './test/stubs/task-node.stub.ts';
import { runCommandOf } from './utils/run-match.util.ts';
import type { RunTaskOptions } from '../run-args/common/run-args.type.ts';
import { turboRunArgs } from '../run-args/utils/run-args.util.ts';
import type { RunSummary } from '../shared/turbo/common/turbo.type.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import type { TaskNode } from '../workspace/common/workspace-model.type.ts';

const TURBO = devTurboPath();

const BUILD: TaskNode = { ...TASK_NODE_STUB, id: `${FORCE_PACKAGE_STUB}#build`, command: null };

const PLAIN: RunTaskOptions = { force: false };

const FORCED: RunTaskOptions = { force: true };

/** Builds the fixture's package in `dir` between two clock reads; `slice(1)` drops `--skip-infer`, which `runTurbo` adds. */
const buildIn = async (dir: string, options: RunTaskOptions): Promise<RunToMatch> => {
  const args = turboRunArgs(BUILD, FORCE_PACKAGE_STUB, options).slice(1);
  const launchedAt = Date.now();
  const result = await runTurbo(TURBO, args, dir);
  const endedAt = Date.now();
  const run: RunToMatch = { task: BUILD, packageName: FORCE_PACKAGE_STUB, launchedAt, endedAt, exitCode: result.exitCode };

  return run;
};

describe('FEATURE: a forced run against turbo 2.11.7', () => {
  let dir = '';
  let plainRun: RunToMatch;
  let second: RunMatch | null = null;
  let forcedRun: RunToMatch;
  let forcedSummary: RunSummary | null = null;
  let forcedMatch: RunMatch | null = null;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'force-contract-'));
    await commitBaseRepo(dir, FORCE_FIXTURE_FILES_STUB);
    plainRun = await buildIn(dir, PLAIN);
    second = await matchRunSummary(dir, await buildIn(dir, PLAIN));
    forcedRun = await buildIn(dir, FORCED);
    forcedSummary = await readNewestRunSummary(dir);
    forcedMatch = await matchRunSummary(dir, forcedRun);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a package built twice, so the second plain run is a cache HIT', () => {
    it('THEN the second plain run is a HIT', () => {
      expect(second).toMatchObject({ cache: 'HIT' });
    });

    it('WHEN it runs again with force THEN turbo exits 0', () => {
      expect(forcedRun.exitCode).toBe(0);
    });

    it('WHEN it runs again with force THEN the summary records the plain run command, with no --force', () => {
      expect(forcedSummary?.execution.command).toBe(runCommandOf(plainRun));
    });

    it('WHEN it runs again with force THEN the summary task is a cache MISS', () => {
      const statuses = forcedSummary?.tasks.map((task) => task.cache.status);

      expect(statuses).toStrictEqual(['MISS']);
    });

    it('WHEN it runs again with force THEN matchRunSummary matches it as a MISS', () => {
      expect(forcedMatch).toMatchObject({ cache: 'MISS' });
    });
  });
});
