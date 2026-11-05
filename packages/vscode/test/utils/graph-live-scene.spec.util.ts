import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { GraphRunState } from '@turbo-console/webview-ui';

import { buildPair } from './build-pair.spec.util.ts';
import { postedRuns } from './graph-posted.spec.util.ts';
import { packageDirOf, setScript, writeEdited } from './package-edit.spec.util.ts';
import { GO_FILES, goScriptOf } from './run-live-case.spec.util.ts';
import { startGraphRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, waitFor } from './suite-env.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { GraphLiveScene, GraphScene } from '../common/graph.type.ts';
import type { ShownTask } from '../common/launch.type.ts';

const BUILD_TASK = 'build';

const RELEASE_LIMIT_MS = 15000;

/** Reads L's `package.json` and pairs A with L from the manifest. */
export const liveSceneOf = async (scene: GraphScene): Promise<GraphLiveScene> => {
  const { api, root } = scene;
  const [a, l] = buildPair(scene.manifest);
  const dir = await packageDirOf(root, l.packageName);
  const manifest = join(dir, 'package.json');
  const manifestText = await readFile(manifest, 'utf8');
  const live: GraphLiveScene = { api, root, a, l, manifest, manifestText };

  return live;
};

export const goFileOf = (scene: GraphLiveScene): string => join(dirname(scene.manifest), 'go');

/** A `go` left by an attempt that died before its clean up would let L exit at once, so it is removed first. */
const blockL = async (scene: GraphLiveScene): Promise<void> => {
  const dir = dirname(scene.manifest);

  await rm(goFileOf(scene), { force: true });
  await writeFile(join(dir, 'go-wait.js'), goScriptOf());
  await writeEdited(scene.manifest, scene.manifestText, (manifest) => {
    setScript(manifest, BUILD_TASK, 'node go-wait.js');
  });
  await whenQuiet(scene.api, scene.root);
};

export const isIdle = (scene: GraphLiveScene, task: ShownTask): boolean =>
  scene.api.runs.get(scene.root, task.fullName)?.state !== 'running';

/** Writes `go` so L's script exits, then waits until neither A nor L has a running entry. */
const releaseBoth = async (scene: GraphLiveScene): Promise<void> => {
  const isReleased = (): boolean => isIdle(scene, scene.a) && isIdle(scene, scene.l);

  await writeFile(goFileOf(scene), '');
  await waitFor('A and L released', isReleased, RELEASE_LIMIT_MS);
};

const cleanUp = async (scene: GraphLiveScene): Promise<void> => {
  const dir = dirname(scene.manifest);

  try {
    await releaseBoth(scene);
  } finally {
    await Promise.all(GO_FILES.map(async (name) => rm(join(dir, name), { force: true })));
    await writeFile(scene.manifest, scene.manifestText);
    await whenQuiet(scene.api, scene.root);
  }
};

const logCleanupFailure = (error: unknown): void => {
  log(`graph live case cleanup failed after the case failed: ${String(error)}`);
};

/** Runs `body` with L blocked on `go`; always releases both runs and puts L's `package.json` back, and a cleanup failure after a failed case is logged, not thrown over it. */
export const withBlockedL = async (scene: GraphLiveScene, body: () => Promise<void>): Promise<void> => {
  await blockL(scene);

  try {
    await body();
  } catch (error) {
    await cleanUp(scene).catch(logCleanupFailure);

    throw error;
  }

  await cleanUp(scene);
};

/** The newest `runs` post shows L running with A as its owner. */
export const isLUnderA = (scene: GraphLiveScene): boolean => {
  const { api, root, a, l } = scene;
  const last = postedRuns(api, root).at(-1);

  return last?.runs[l.fullName] === 'running' && last.owners?.[l.fullName] === a.fullName;
};

/** A `runs` post after the first `seen` shows L in `state` with no owner. */
export const isLLeftAs = (scene: GraphLiveScene, seen: number, state: GraphRunState): boolean => {
  const { api, root, l } = scene;
  const later = postedRuns(api, root).slice(seen);

  return later.some((message) => message.runs[l.fullName] === state && message.owners?.[l.fullName] === undefined);
};

/** Starts A from the graph and waits for the first post that shows L under A; logs how long the post took. */
export const startedUnderA = async (scene: GraphLiveScene, name: string): Promise<number> => {
  const { api, a } = scene;
  const node = await taskNodeNamed(api, a.packageName, a.fullName);
  const launchedAt = await startGraphRun(api, node);

  await waitFor('L running under A', () => isLUnderA(scene));
  log(`${name}: first owners post ${Date.now() - launchedAt} ms after the launch`);

  return launchedAt;
};

export const nodeOf = async (scene: GraphLiveScene, task: ShownTask): Promise<TreeNode> =>
  taskNodeNamed(scene.api, task.packageName, task.fullName);
