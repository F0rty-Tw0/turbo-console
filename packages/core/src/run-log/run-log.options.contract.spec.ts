import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { RunLogRepo } from './test/common/run-log-repo.type.ts';
import { RUN_LOG_APP_STUB, RUN_LOG_LIB_STUB } from './test/stubs/run-log-fixture.stub.ts';
import { eventsOf } from './test/utils/run-log-event.spec.util.ts';
import { logEnvOf, logOf } from './test/utils/run-log-gates.spec.util.ts';
import { createRunLogRepo, disposeRunLogRepos, readRunLog, taskNodeOf } from './test/utils/run-log-turbo.spec.util.ts';
import type { RunTaskOptions } from '../run-args/common/run-args.type.ts';
import { turboRunArgs } from '../run-args/utils/run-args.util.ts';
import { waitForExit } from '../shared/turbo/test/utils/turbo-process.spec.util.ts';

const PASS_THROUGH = ['--watch', '--port=3000', './src/a.ts', '--env=dev:local'];

const EXPECTED = JSON.stringify(PASS_THROUGH);

const LOG = logOf('options');

const APP_BUILD = `${RUN_LOG_APP_STUB}#build`;
const LIB_BUILD = `${RUN_LOG_LIB_STUB}#build`;

const WITH_ARGS: RunTaskOptions = { force: false, passThrough: PASS_THROUGH };
const WITH_ARGS_ONLY: RunTaskOptions = { force: false, only: true, passThrough: PASS_THROUGH };
const ONLY: RunTaskOptions = { force: false, only: true };

/** What the `args` script of package folder `lib` or `app` wrote; `null` when it never ran. */
const argvOf = async (repo: RunLogRepo, folder: string): Promise<string | null> => {
  const file = join(repo.dir, '.turbo', `args-${folder}.json`);
  const exists = existsSync(file);

  if (!exists) return null;

  return readFile(file, 'utf8');
};

/** Runs `<packageName>#<taskName>` with `options` in `repo` and waits for turbo to exit. */
const runIn = async (repo: RunLogRepo, packageName: string, taskName: string, options: RunTaskOptions): Promise<number | null> => {
  const args = turboRunArgs(taskNodeOf(packageName, taskName), packageName, options);

  return waitForExit(repo.launch(args, logEnvOf(LOG)));
};

describe('FEATURE: pass-through args and --only on the run-log fixture (M3-3 C4, C5)', () => {
  const repos: RunLogRepo[] = [];

  const newRepo = async (): Promise<RunLogRepo> => {
    const repo = await createRunLogRepo();

    repos.push(repo);

    return repo;
  };

  afterAll(async () => {
    await disposeRunLogRepos(repos);
  });

  describe('GIVEN @acme/app#args run with pass-through args (C4)', () => {
    let exitCode: number | null = null;
    let appArgv: string | null = null;
    let libArgv: string | null = null;

    beforeAll(async () => {
      const repo = await newRepo();

      exitCode = await runIn(repo, RUN_LOG_APP_STUB, 'args', WITH_ARGS);
      appArgv = await argvOf(repo, 'app');
      libArgv = await argvOf(repo, 'lib');
    });

    it('THEN turbo exits 0', () => {
      expect(exitCode).toBe(0);
    });

    it('THEN the app script argv is the pass-through list unchanged', () => {
      expect(appArgv).toBe(EXPECTED);
    });

    it('THEN the same-named dependency script gets the same argv (P9)', () => {
      expect(libArgv).toBe(EXPECTED);
    });
  });

  describe('GIVEN the same run with only (C4)', () => {
    let exitCode: number | null = null;
    let appArgv: string | null = null;
    let libArgv: string | null = null;

    beforeAll(async () => {
      const repo = await newRepo();

      exitCode = await runIn(repo, RUN_LOG_APP_STUB, 'args', WITH_ARGS_ONLY);
      appArgv = await argvOf(repo, 'app');
      libArgv = await argvOf(repo, 'lib');
    });

    it('THEN turbo exits 0', () => {
      expect(exitCode).toBe(0);
    });

    it('THEN the app script argv is the pass-through list unchanged', () => {
      expect(appArgv).toBe(EXPECTED);
    });

    it('THEN the dependency script never runs', () => {
      expect(libArgv).toBeNull();
    });
  });

  describe('GIVEN @acme/app#build run with only (C5)', () => {
    let exitCode: number | null = null;
    let appTaskIds: string[] = [];
    let libTaskIds: string[] = [];

    beforeAll(async () => {
      const repo = await newRepo();

      exitCode = await runIn(repo, RUN_LOG_APP_STUB, 'build', ONLY);

      const events = eventsOf(await readRunLog(join(repo.dir, LOG)));
      const taskIds = events.map((event) => event.taskId);

      appTaskIds = taskIds.filter((taskId) => taskId === APP_BUILD);
      libTaskIds = taskIds.filter((taskId) => taskId === LIB_BUILD);
    });

    it('THEN turbo exits 0 without waiting for the lib go file', () => {
      expect(exitCode).toBe(0);
    });

    it('THEN the log holds an event for @acme/app#build', () => {
      expect(appTaskIds).not.toStrictEqual([]);
    });

    it('THEN the log holds no event for the dependency @acme/lib#build', () => {
      expect(libTaskIds).toStrictEqual([]);
    });
  });
});
