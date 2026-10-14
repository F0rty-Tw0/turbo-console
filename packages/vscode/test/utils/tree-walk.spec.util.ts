import type { TaskKind } from '@turbo-console/repo-gen';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest, ShownTask, WalkedTree } from '../common/launch.type.ts';

const SHOWN_TASK_KINDS: ReadonlySet<TaskKind> = new Set<TaskKind>(['task', 'aggregate', 'umbrella']);

const shownTasksOf = (manifest: ShownManifest): ShownTask[] => {
  const isShown = (task: ShownTask): boolean => task.visible && SHOWN_TASK_KINDS.has(task.kind);

  return manifest.tasks.filter(isShown);
};

const collectFrom = async (api: TurboConsoleApi, parent: TreeNode | undefined, found: TreeNode[]): Promise<void> => {
  const children = await api.tree.getChildren(parent);

  for (const node of children) {
    found.push(node);

    const hasChildren = node.kind !== 'task' && node.kind !== 'msg';

    if (hasChildren) await collectFrom(api, node, found);
  }
};

/** Every node reached from the top through root, dir and package nodes, in walk order. */
const allNodes = async (api: TurboConsoleApi): Promise<TreeNode[]> => {
  const found: TreeNode[] = [];

  await collectFrom(api, undefined, found);

  return found;
};

const keysOf = (nodes: TreeNode[], kind: TreeNode['kind']): string[] => {
  const ofKind = nodes.filter((node) => node.kind === kind);
  const keys = ofKind.map((node) => node.key);

  return keys.sort();
};

/** The `pkg` and `task` node keys of the whole tree, each sorted. */
export const walkTree = async (api: TurboConsoleApi): Promise<WalkedTree> => {
  const nodes = await allNodes(api);
  const packages = keysOf(nodes, 'pkg');
  const tasks = keysOf(nodes, 'task');
  const walked: WalkedTree = { packages, tasks };

  return walked;
};

/**
 * What spec §5.3 case 1 expects the tree to show for a fixture: every package but the atom definitions packages, and
 * every visible task of kind `task`, `aggregate` or `umbrella` (no `atom-file`), each sorted.
 */
export const manifestTree = (manifest: ShownManifest): WalkedTree => {
  const shownPackages = manifest.packages.filter((pkg) => pkg.role !== 'atom-definitions');
  const shownTasks = shownTasksOf(manifest);
  const packageNames = shownPackages.map((pkg) => pkg.name);
  const taskIds = shownTasks.map((task) => task.fullName);
  const packages = packageNames.sort();
  const tasks = taskIds.sort();
  const walked: WalkedTree = { packages, tasks };

  return walked;
};

/** The package with the most shown tasks, the first by name on a tie; throws when no package has one. */
export const busiestPackage = (manifest: ShownManifest): string => {
  const counts = new Map<string, number>();

  for (const task of shownTasksOf(manifest)) {
    const count = counts.get(task.packageName) ?? 0;

    counts.set(task.packageName, count + 1);
  }

  const names = Array.from(counts.keys()).sort();
  const values = Array.from(counts.values());
  const most = Math.max(...values);
  const busiest = names.find((name) => counts.get(name) === most);

  if (busiest === undefined) throw new Error('the manifest has no shown task');

  return busiest;
};

/**
 * The node of package `name`, reached through root and dir nodes only, so no package's children are built on the way;
 * throws when the tree holds no such package.
 */
export const packageNodeNamed = async (api: TurboConsoleApi, name: string): Promise<TreeNode> => {
  const parents: (TreeNode | undefined)[] = [undefined];

  for (const parent of parents) {
    const children = await api.tree.getChildren(parent);
    const found = children.find((node) => node.kind === 'pkg' && node.key === name);

    if (found !== undefined) return found;

    const containers = children.filter((node) => node.kind === 'root' || node.kind === 'dir');

    parents.push(...containers);
  }

  throw new Error(`the tree holds no package ${name}`);
};
