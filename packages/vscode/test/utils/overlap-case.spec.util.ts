import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { packageDirOf, setScript, writeEdited } from './package-edit.spec.util.ts';
import { endedRun, startRun, summaryMatch, summaryNames, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, step } from './suite-env.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { ShownTask } from '../common/launch.type.ts';

const BUILD_TASK = 'build';

/** One package's `package.json` and its text before the case. */
type EditedManifest = {
  readonly file: string;
  readonly text: string;
};

type OverlapScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly x: ShownTask;
  readonly y: ShownTask;
  readonly manifests: EditedManifest[];
};

/**
 * Sleeps 1.5 s, so the two runs' processes overlap (Review Focus 2). The pass tag changes the script, so turbo's cache
 * misses on every pass and the second pass sleeps too.
 */
const sleepScript = (pass: number): string => `node -e "setTimeout(()=>{},1500)" pass-${pass}`;

const manifestOf = async (root: string, name: string): Promise<EditedManifest> => {
  const dir = await packageDirOf(root, name);
  const file = join(dir, 'package.json');
  const text = await readFile(file, 'utf8');
  const manifest: EditedManifest = { file, text };

  return manifest;
};

const setSleep = async (manifest: EditedManifest, pass: number): Promise<void> => {
  await writeEdited(manifest.file, manifest.text, (parsed) => {
    setScript(parsed, BUILD_TASK, sleepScript(pass));
  });
};

/** Whether the two runs' processes ran at the same time: each started before the other ended. */
const isOverlap = (left: RunEntry, right: RunEntry): boolean => {
  const { processStartedAt: leftStart, endedAt: leftEnd } = left;
  const { processStartedAt: rightStart, endedAt: rightEnd } = right;

  if (leftStart === null || leftEnd === null) return false;

  if (rightStart === null || rightEnd === null) return false;

  return leftStart <= rightEnd && rightStart <= leftEnd;
};

const windowText = (entry: RunEntry): string => `${entry.taskId} [${entry.processStartedAt}, ${entry.endedAt}]`;

/** Asserts `entry` passed and holds exactly what its own summary, among those written since `before`, says of it. */
const assertOwnSummary = async (scene: OverlapScene, entry: RunEntry, before: string[]): Promise<void> => {
  const command = `turbo run ${BUILD_TASK} --filter=${entry.packageName}`;
  const expected = await summaryMatch(scene.root, before, command, entry.taskId);

  assert.equal(entry.state, 'passed', `${entry.taskId} ended ${entry.state}`);
  assert.deepEqual(entry.match, expected, `${entry.taskId} shows another run's summary data`);
};

/** One pass: both scripts sleep, `first` and `second` start without an await between them, both end. */
const overlapPass = async (scene: OverlapScene, pass: number, firstIsY: boolean): Promise<void> => {
  const { api, x, y } = scene;
  const order = firstIsY ? 'Y then X' : 'X then Y';

  await step(`3: overlapping runs, pass ${pass} (${order})`, async () => {
    await Promise.all(scene.manifests.map(async (manifest) => setSleep(manifest, pass)));
    await whenQuiet(api, scene.root);

    const before = await summaryNames(scene.root);
    const xNode = await taskNodeNamed(api, x.packageName, x.fullName);
    const yNode = await taskNodeNamed(api, y.packageName, y.fullName);
    const first = firstIsY ? yNode : xNode;
    const second = firstIsY ? xNode : yNode;
    const [firstAt, secondAt] = await Promise.all([startRun(api, first), startRun(api, second)]);
    const [firstEnded, secondEnded] = await Promise.all([endedRun(api, first, firstAt), endedRun(api, second, secondAt)]);
    const isOverlapping = isOverlap(firstEnded, secondEnded);

    log(`overlap pass ${pass}: ${windowText(firstEnded)}, ${windowText(secondEnded)}`);
    assert.ok(isOverlapping, 'the two runs did not overlap');
    await assertOwnSummary(scene, firstEnded, before);
    await assertOwnSummary(scene, secondEnded, before);
  });
};

/**
 * Spec §5.3 case 3: Y = the dependency's `build`, X = the dependent's `build`, both sleeping, started together, Y first
 * and then X first. Each run shows its own summary's data, never the other's. Puts both `package.json` files back.
 */
export const overlapCase = async (api: TurboConsoleApi, root: string, x: ShownTask, y: ShownTask): Promise<void> => {
  const manifests = [await manifestOf(root, x.packageName), await manifestOf(root, y.packageName)];
  const scene: OverlapScene = { api, root, x, y, manifests };

  try {
    await overlapPass(scene, 1, true);
    await overlapPass(scene, 2, false);
  } finally {
    await Promise.all(manifests.map(async (manifest) => writeFile(manifest.file, manifest.text)));
    await whenQuiet(api, root);
  }
};
