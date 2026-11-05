import assert from 'node:assert/strict';
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

const GO_SCRIPT = GO_LINES.join('\n');

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

const prepareBlockedX = async (scene: LiveScene): Promise<void> => {
  await writeFile(join(dirname(scene.manifest), 'go-wait.js'), GO_SCRIPT);
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

  assert.equal(api.runs.get(root, x.fullName)?.state, 'running', 'X ended before Y was recorded');
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

/**
 * U7e1: X's build blocks on a `go` file, so only the log tail can have recorded Y while X runs; the settle comes after
 * X ends. Holds in stream and grouped log order: Y finishes before X starts, and grouped order flushes a task's lines at
 * its end. Puts X's `package.json` back and removes the `go` files.
 */
export const liveCase = async (scene: LiveScene): Promise<void> => {
  const dir = dirname(scene.manifest);

  try {
    await step(
      'U7e1: a tree run of X records its dependency Y from the live log while X still runs, then settles it and removes the log file',
      async () => {
        await prepareBlockedX(scene);
        await runBlockedX(scene);
      }
    );
  } finally {
    await Promise.all(GO_FILES.map(async (name) => rm(join(dir, name), { force: true })));
    await writeFile(scene.manifest, scene.manifestText);
    await whenQuiet(scene.api, scene.root);
  }
};
