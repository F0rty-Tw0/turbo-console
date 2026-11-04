import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { commitBaseRepo } from '@turbo-console/repo-gen';

import { TASK_NODE_STUB } from '../../../run-summary/test/stubs/task-node.stub.ts';
import { devTurboPath } from '../../../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { stopRun, streamedTurboEnv } from '../../../shared/turbo/test/utils/turbo-process.spec.util.ts';
import type { TaskNode } from '../../../workspace/common/workspace-model.type.ts';
import type { RunLogEntry } from '../../common/run-log.type.ts';
import { scanRunLog } from '../../utils/run-log-scan.util.ts';
import type { RunLogRepo } from '../common/run-log-repo.type.ts';
import { RUN_LOG_DIR_STUB, RUN_LOG_FIXTURE_FILES_STUB } from '../stubs/run-log-fixture.stub.ts';

const isRunning = (child: ChildProcess): boolean => child.exitCode === null && child.signalCode === null;

/** A committed copy of the gate fixture repo with an empty `RUN_LOG_DIR_STUB`; removes the copy when making it fails. */
export const createRunLogRepo = async (): Promise<RunLogRepo> => {
  const dir = await mkdtemp(join(tmpdir(), 'run-log-gates-'));
  const children: ChildProcess[] = [];

  try {
    await commitBaseRepo(dir, RUN_LOG_FIXTURE_FILES_STUB);
    await mkdir(join(dir, RUN_LOG_DIR_STUB), { recursive: true });
  } catch (error) {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });

    throw error;
  }

  const launch = (args: string[], env: Record<string, string>): ChildProcess => {
    const streamed = streamedTurboEnv(env);
    const child = spawn(devTurboPath(), args, { cwd: dir, env: streamed, detached: true, stdio: 'ignore' });

    children.push(child);

    return child;
  };

  const dispose = async (): Promise<void> => {
    const running = children.filter(isRunning);

    await Promise.all(running.map(stopRun));
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  };

  const repo: RunLogRepo = { dir, launch, dispose };

  return repo;
};

/** `<packageName>#<taskName>` as the plain task node `turboRunArgs` and `matchRunSummary` take. */
export const taskNodeOf = (packageName: string, taskName: string): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${packageName}#${taskName}`, name: taskName, command: null };

  return task;
};

/** The bytes of the log at `path`; empty while turbo has not created it. */
export const readRunLogBytes = async (path: string): Promise<Uint8Array> => {
  const exists = existsSync(path);

  if (!exists) return new Uint8Array();

  const bytes = await readFile(path);

  return bytes;
};

/** Every complete entry in the log at `path`, even while turbo is still writing it. */
export const readRunLog = async (path: string): Promise<RunLogEntry[]> => {
  const bytes = await readRunLogBytes(path);
  const { entries } = scanRunLog(bytes, 0);

  return entries;
};
