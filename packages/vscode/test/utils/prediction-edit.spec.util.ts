import { descriptionIfAny } from './prediction-scene.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest, ShownTask } from '../common/launch.type.ts';
import { CACHED_WORD } from '../common/prediction.const.ts';
import type { PredictionScene } from '../common/prediction.type.ts';

const isTaskRow = (node: TreeNode): boolean => node.kind === 'task';

/** The ids of the task rows of package `name` that read cached now. */
const cachedRowIdsOf = async (scene: PredictionScene, name: string): Promise<string[]> => {
  const { api } = scene;
  const pkg = await packageNodeNamed(api, name);
  const children = await api.tree.getChildren(pkg);
  const isCached = (node: TreeNode): boolean => descriptionIfAny(api, node) === CACHED_WORD;
  const rows = children.filter(isTaskRow).filter(isCached);

  return rows.map((row) => row.key);
};

/** The ids of every shown task row of the packages `names` that reads cached now, in the order of `names`. */
export const cachedIdsOf = async (scene: PredictionScene, names: string[]): Promise<string[]> => {
  const ids: string[] = [];

  for (const name of names) {
    const rowIds = await cachedRowIdsOf(scene, name);

    ids.push(...rowIds);
  }

  return ids;
};

const isOwnTask = (task: ShownTask, packageName: string): boolean => task.packageName === packageName;

/** The ids of the tasks of `packageName` and of every task that depends on one of them, directly or through others. */
export const taintedIdsOf = (manifest: ShownManifest, packageName: string): Set<string> => {
  const own = manifest.tasks.filter((task) => isOwnTask(task, packageName));
  const tainted = new Set(own.map((task) => task.fullName));
  const dependsOnTainted = (task: ShownTask): boolean => task.dependencies.some((id) => tainted.has(id));
  let size = -1;

  while (size !== tainted.size) {
    size = tainted.size;

    for (const task of manifest.tasks.filter(dependsOnTainted)) tainted.add(task.fullName);
  }

  return tainted;
};
