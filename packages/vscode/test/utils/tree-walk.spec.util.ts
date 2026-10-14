import type { TaskKind } from '@turbo-console/repo-gen';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest, ShownTask, WalkedTree } from '../common/launch.type.ts';

const SHOWN_TASK_KINDS: ReadonlySet<TaskKind> = new Set<TaskKind>(['task', 'aggregate', 'umbrella']);

const shownTasksOf = (manifest: ShownManifest): ShownTask[] => {
  const isShown = (task: ShownTask): boolean => task.visible && SHOWN_TASK_KINDS.has(task.kind);

  return manifest.tasks.filter(isShown);
};

/** Adds `value` to the list under `key`, creating the list on first use. */
const groupUnder = (groups: Record<string, string[]>, key: string, value: string): void => {
  const group = groups[key] ?? [];

  group.push(value);
  groups[key] = group;
};

const sortGroups = (groups: Record<string, string[]>): void => {
  for (const group of Object.values(groups)) group.sort();
};

/** The `pkg` node a `task` row sits under; throws when it sits anywhere else. */
const packageKeyOf = (task: TreeNode, parent: TreeNode | undefined): string => {
  if (parent?.kind !== 'pkg') throw new Error(`task row ${task.key} sits outside a package`);

  return parent.key;
};

/** Pushes every node below `parent` to `found`, and files each `task` row's key under the key of the package it sits in. */
const collectFrom = async (
  api: TurboConsoleApi,
  parent: TreeNode | undefined,
  found: TreeNode[],
  tasks: Record<string, string[]>
): Promise<void> => {
  const children = await api.tree.getChildren(parent);

  for (const node of children) {
    found.push(node);

    if (node.kind === 'task') groupUnder(tasks, packageKeyOf(node, parent), node.key);

    const hasChildren = node.kind !== 'task' && node.kind !== 'msg';

    if (hasChildren) await collectFrom(api, node, found, tasks);
  }
};

const keysOf = (nodes: TreeNode[], kind: TreeNode['kind']): string[] => {
  const ofKind = nodes.filter((node) => node.kind === kind);
  const keys = ofKind.map((node) => node.key);

  return keys.sort();
};

/** Each package's shown task ids, keyed by package name; a package with no shown task has no entry. */
const tasksByPackage = (manifest: ShownManifest): Record<string, string[]> => {
  const tasks: Record<string, string[]> = {};

  for (const task of shownTasksOf(manifest)) groupUnder(tasks, task.packageName, task.fullName);

  return tasks;
};

/** The whole tree walked from the top through root, dir and package nodes. */
export const walkTree = async (api: TurboConsoleApi): Promise<WalkedTree> => {
  const nodes: TreeNode[] = [];
  const tasks: Record<string, string[]> = {};

  await collectFrom(api, undefined, nodes, tasks);
  sortGroups(tasks);

  const packages = keysOf(nodes, 'pkg');
  const messages = keysOf(nodes, 'msg');
  const walked: WalkedTree = { packages, tasks, messages };

  return walked;
};

/**
 * What spec §5.3 case 1 expects the tree to show for a fixture: every package but the atom definitions packages, under
 * each package every visible task of kind `task`, `aggregate` or `umbrella` (no `atom-file`), and no message row.
 */
export const manifestTree = (manifest: ShownManifest): WalkedTree => {
  const shownPackages = manifest.packages.filter((pkg) => pkg.role !== 'atom-definitions');
  const packageNames = shownPackages.map((pkg) => pkg.name);
  const packages = packageNames.sort();
  const tasks = tasksByPackage(manifest);

  sortGroups(tasks);

  const walked: WalkedTree = { packages, tasks, messages: [] };

  return walked;
};

/** The package with the most shown tasks, the first by name on a tie; throws when no package has one. */
export const busiestPackage = (manifest: ShownManifest): string => {
  const tasks = tasksByPackage(manifest);
  const names = Object.keys(tasks).sort();
  const counts = names.map((name) => tasks[name]?.length ?? 0);
  const most = Math.max(...counts);
  const busiest = names.find((name) => tasks[name]?.length === most);

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
