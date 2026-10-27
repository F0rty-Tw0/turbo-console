import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { commitBaseRepo } from '@turbo-console/repo-gen';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { RunMatch, RunToMatch } from './common/run-match.type.ts';
import { matchRunSummary } from './domain-logic/match-run-summary.ts';
import { readNewestRunSummary } from './domain-logic/read-newest-run-summary.ts';
import {
  INTERRUPT_FIXTURE_FILES_STUB,
  INTERRUPT_PACKAGE_STUB,
  SLOW_READY_STUB,
  SLOW_SCRIPT_MS_STUB,
  SLOW_SCRIPT_STUB
} from './test/stubs/interrupt-fixture.stub.ts';
import { TASK_NODE_STUB } from './test/stubs/task-node.stub.ts';
import { turboRunArgs } from '../run-args/utils/run-args.util.ts';
import type { RunSummary } from '../shared/turbo/common/turbo.type.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { turboEnv } from '../shared/turbo/utils/turbo-env.util.ts';
import type { TaskNode } from '../workspace/common/workspace-model.type.ts';

const TURBO = devTurboPath();

const SLOW: TaskNode = { ...TASK_NODE_STUB, id: `${INTERRUPT_PACKAGE_STUB}#slow`, name: 'slow', command: SLOW_SCRIPT_STUB };

/** Resolves once `child` has printed `text` on stdout; rejects when it exits first. */
const printed = async (child: ChildProcess, text: string): Promise<void> => {
  const { promise, resolve, reject } = Promise.withResolvers<undefined>();
  let output = '';

  const onData = (chunk: Buffer): void => {
    output += chunk.toString();
    const hasText = output.includes(text);

    if (hasText) resolve(undefined);
  };

  const onExit = (): void => reject(new Error(`turbo exited before printing ${text}:\n${output}`));

  child.stdout?.on('data', onData);
  child.once('exit', onExit);

  try {
    await promise;
  } finally {
    child.stdout?.off('data', onData);
    child.off('exit', onExit);
  }
};

/**
 * Signals the process group `child` leads (it was spawned `detached`), as Ctrl+C in a terminal signals the foreground
 * group. Turbo runs the package manager in a group of its own and relays the signal to it, so the script ends as well.
 */
const signalGroup = (child: ChildProcess, signal: NodeJS.Signals): void => {
  const { pid } = child;

  if (pid === undefined) return;

  try {
    process.kill(-pid, signal);
  } catch {
    // The group has already exited.
  }
};

/** The exit code of `child`, which has exited; throws when a signal killed it, so there is no code. */
const exitCodeOf = (child: ChildProcess): number => {
  if (child.exitCode === null) throw new Error(`turbo was killed by ${child.signalCode}`);

  return child.exitCode;
};

describe.skipIf(process.platform === 'win32')('FEATURE: a turbo 2.11.7 run interrupted by SIGINT (Ctrl+C in its terminal)', () => {
  let dir = '';
  let child: ChildProcess | null = null;
  let run: RunToMatch;
  let summary: RunSummary | null = null;
  let match: RunMatch | null = null;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'interrupt-contract-'));
    await commitBaseRepo(dir, INTERRUPT_FIXTURE_FILES_STUB);

    const launchedAt = Date.now();

    // Under GITHUB_ACTIONS turbo holds a task's output until the task ends; streaming prints `slow-ready` while it runs.
    const env = turboEnv(process.env);

    env['TURBO_LOG_ORDER'] = 'stream';

    child = spawn(TURBO, turboRunArgs(SLOW, INTERRUPT_PACKAGE_STUB), { cwd: dir, env, detached: true });
    const exited = once(child, 'exit');

    await printed(child, SLOW_READY_STUB);
    signalGroup(child, 'SIGINT');
    await exited;

    const exitCode = exitCodeOf(child);

    run = { task: SLOW, packageName: INTERRUPT_PACKAGE_STUB, launchedAt, endedAt: Date.now(), exitCode };
    summary = await readNewestRunSummary(dir);
    match = await matchRunSummary(dir, run);
  });

  afterAll(async () => {
    if (child !== null) signalGroup(child, 'SIGKILL');
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a slow task interrupted once its script printed', () => {
    it('THEN turbo ended long before the script would have: the signal came mid-task', () => {
      expect(run.endedAt - run.launchedAt).toBeLessThan(SLOW_SCRIPT_MS_STUB / 2);
    });

    it('THEN turbo exits 0, as for a passed run', () => {
      expect(run.exitCode).toBe(0);
    });

    it('THEN the summary lists no entry for the task, though turbo attempted it', () => {
      const taskIds = summary?.tasks.map((task) => task.taskId);

      expect(taskIds).not.toContain(SLOW.id);
      expect(summary?.execution).toMatchObject({ attempted: 1, success: 0, failed: 0, cached: 0 });
    });

    it('THEN matchRunSummary matches it as interrupted, with no cache status', () => {
      expect(match).toMatchObject({ cache: null, interrupted: true });
      expect(match?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
