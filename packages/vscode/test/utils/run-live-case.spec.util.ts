import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { setScript, writeEdited } from './package-edit.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, step, waitFor } from './suite-env.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import { RUN_LOG_FILE_PATTERN } from '../../src/run/common/run-log-tail.const.ts';
import type { ProgressRecord } from '../../src/run/common/run-progress.type.ts';
import { runLogDirOf } from '../../src/run/utils/run-log-dir.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { ShownTask } from '../common/launch.type.ts';

const BUILD_TASK = 'build';

/** Blocks until `go` exists in its directory; exits 2 by itself after 60 s without it. */
const GO_LINES = [
  "const fs = require('node:fs');",
  'setTimeout(() => process.exit(2), 60000).unref();',
  "const poll = setInterval(() => { if (fs.existsSync('go')) { clearInterval(poll); process.exit(0); } }, 50);"
];

/** A fresh token line per call changes X's task hash, so a relaunch in the same fixture never replays X from turbo's cache. */
const goScriptOf = (): string => {
  const lines = [`// ${randomUUID()}`, ...GO_LINES];

  return lines.join('\n');
};

const GO_FILES = ['go-wait.js', 'go'];

/** X = a shown `build` task that depends on Y; `manifest` is X's `package.json` and `manifestText` its text before the case. */
type LiveScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly x: ShownTask;
  readonly y: ShownTask;
  readonly manifest: string;
  readonly manifestText: string;
};

const logFilesOf = (root: string): string[] => {
  const dir = runLogDirOf(root);
  const hasDir = existsSync(dir);

  if (!hasDir) return [];

  const names = readdirSync(dir);

  return names.filter((name) => RUN_LOG_FILE_PATTERN.test(name));
};

/** The record of Y that the run of X launched at `launchedAt` holds. */
const recordOfY = (scene: LiveScene, launchedAt: number): ProgressRecord | undefined => {
  const { api, root, x, y } = scene;
  const records = api.progress.recordsOf(root, y.fullName);
  const isOwn = (record: ProgressRecord): boolean => record.owner.launchedAt === launchedAt && record.owner.taskId === x.fullName;

  return records.find(isOwn);
};

/** A `go` left by an attempt that died before its clean up would let X exit at once, so it is removed first. */
const prepareBlockedX = async (scene: LiveScene): Promise<void> => {
  const dir = dirname(scene.manifest);

  await rm(join(dir, 'go'), { force: true });
  await writeFile(join(dir, 'go-wait.js'), goScriptOf());
  await writeEdited(scene.manifest, scene.manifestText, (manifest) => {
    setScript(manifest, BUILD_TASK, 'node go-wait.js');
  });
  await whenQuiet(scene.api, scene.root);
};

/** Waits for Y's first record while X still blocks on `go`, so only the tail can have made it; logs what polling saw. */
const awaitLiveRecord = async (scene: LiveScene, launchedAt: number): Promise<void> => {
  const { api, root, x } = scene;
  const states = new Set<string>();
  const firstAts: number[] = [];
  const isRecorded = (): boolean => {
    const record = recordOfY(scene, launchedAt);

    if (record === undefined) return false;

    states.add(record.state);

    if (firstAts.length === 0) firstAts.push(record.at);

    return true;
  };

  await waitFor('Y recorded live', isRecorded);

  const firstMs = (firstAts[0] ?? Number.NaN) - launchedAt;
  const seen = [...states];

  const entry = api.runs.get(root, x.fullName);

  assert.equal(entry?.state, 'running', 'X ended before Y was recorded');
  assert.equal(entry.launchedAt, launchedAt, 'the running entry of X is not this run');
  log(`live run: Y states seen ${seen.join(', ')}, first record ${firstMs} ms after the launch`);
};

const runBlockedX = async (scene: LiveScene): Promise<void> => {
  const { api, root, x } = scene;
  const node = await taskNodeNamed(api, x.packageName, x.fullName);
  const launchedAt = await startRun(api, node);

  await awaitLiveRecord(scene, launchedAt);
  await writeFile(join(dirname(scene.manifest), 'go'), '');

  const entry = await endedRun(api, node, launchedAt);
  const isSettled = (): boolean => {
    const record = recordOfY(scene, launchedAt);

    return record?.state === 'passed' && record.at === entry.endedAt;
  };

  assert.equal(entry.state, 'passed');
  await waitFor('Y settled', isSettled);
  await waitFor('log file removed', () => logFilesOf(root).length === 0);
};

const RELEASE_LIMIT_MS = 15000;

/** Writes `go` so X's script exits, then waits until X's run is no longer running. */
const releaseX = async (scene: LiveScene): Promise<void> => {
  const { api, root, x, manifest } = scene;
  const isEnded = (): boolean => api.runs.get(root, x.fullName)?.state !== 'running';

  await writeFile(join(dirname(manifest), 'go'), '');
  await waitFor('X released', isEnded, RELEASE_LIMIT_MS);
};

const cleanUp = async (scene: LiveScene): Promise<void> => {
  const dir = dirname(scene.manifest);

  try {
    await releaseX(scene);
  } finally {
    await Promise.all(GO_FILES.map(async (name) => rm(join(dir, name), { force: true })));
    await writeFile(scene.manifest, scene.manifestText);
    await whenQuiet(scene.api, scene.root);
  }
};

const logCleanupFailure = (error: unknown): void => {
  log(`live run cleanup failed after the case failed: ${String(error)}`);
};

/**
 * U7e1: X's build blocks on a `go` file, so only the log tail can have recorded Y while X runs; the settle comes after
 * X ends. Holds in stream and grouped log order: Y finishes before X starts, and grouped order flushes a task's lines at
 * its end. Each call writes a new script, so a relaunch cannot replay X from the cache. Releases X, puts X's
 * `package.json` back and removes the `go` files; after a failed case a cleanup failure is logged, not thrown over it.
 */
export const liveCase = async (scene: LiveScene): Promise<void> => {
  try {
    await step(
      'U7e1: a tree run of X records its dependency Y from the live log while X still runs, then settles it and removes the log file',
      async () => {
        await prepareBlockedX(scene);
        await runBlockedX(scene);
      }
    );
  } catch (error) {
    await cleanUp(scene).catch(logCleanupFailure);

    throw error;
  }

  await cleanUp(scene);
};
