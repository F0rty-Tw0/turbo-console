import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { scriptOf, taskOf } from './shown-set.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphTask } from '../../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../../common/folder-group.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import { elkTaskGraphOf } from '../../utils/elk-task-graph.util.ts';
import { NAMING_STUB } from '../stubs/graph-task.stub.ts';
import { NODE_SIZE_STUB } from '../stubs/node-size.stub.ts';

const FOLDERS = ['a', 'b', 'c'];

/** A node size for every name. */
export const sizeOf = (): NodeSize => NODE_SIZE_STUB;

const slotsOf = (count: number): number[] => Array.from({ length: count }, (_unused, index) => index);

const folderOfSlot = (slot: number): string => FOLDERS[slot % FOLDERS.length] ?? '';

/** `count` package names, `p0` … */
export const packageNamesOf = (count: number): string[] => slotsOf(count).map((slot) => `p${slot}`);

/** One dependency edge from each name to the next, so the names form one component. */
export const chainEdgesOf = (names: string[]): GraphEdge[] => {
  const edgeOf = (target: string, slot: number): GraphEdge => {
    const source = names[slot] ?? target;
    const edge: GraphEdge = { source, target };

    return edge;
  };

  return names.slice(1).map(edgeOf);
};

/** `count` packages spread over the three folders `a`, `b` and `c`, one group per folder. */
export const foldersOfPackages = (count: number): FolderGroup[] => {
  const packageOf = (name: string): GraphPackage => {
    const pkg: GraphPackage = { name, bareName: name, path: name, tags: [], taskCount: 0 };

    return pkg;
  };
  const packages = packageNamesOf(count).map(packageOf);
  const groupOf = (folder: string, folderSlot: number): FolderGroup => {
    const own = packages.filter((_pkg, slot) => slot % FOLDERS.length === folderSlot);
    const group: FolderGroup = { folder, packages: own };

    return group;
  };

  return FOLDERS.map(groupOf);
};

/**
 * The task ELK input of `turboCount` turbo tasks and `scriptCount` scripts over the packages `p0`, `p1` and `p2`, which sit
 * in the folders `a`, `b` and `c`; the leaves are unlinked.
 */
export const taskGraphOf = (turboCount: number, scriptCount: number, grouped: boolean): ElkNode => {
  const turbo = slotsOf(turboCount).map((slot) => taskOf(`p${slot % FOLDERS.length}#t${slot}`, []));
  const scripts = slotsOf(scriptCount).map((slot) => scriptOf(`p${slot % FOLDERS.length}#s${slot}`, []));
  const tasks: GraphTask[] = [...turbo, ...scripts];
  const shown = new Set(tasks.map((task) => task.id));
  const folders = new Map(packageNamesOf(FOLDERS.length).map((name, slot) => [name, folderOfSlot(slot)]));
  const naming = { ...NAMING_STUB, grouped, folders };
  const request = { tasks, shown, sizes: new Map<string, NodeSize>(), titleWidths: new Map<string, number>(), naming };

  return elkTaskGraphOf(request, sizeOf);
};

/** The values of layout option `key` on `node` and on every node below it that sets it, parents first. */
export const optionValuesOf = (node: ElkNode, key: string): string[] => {
  const value = node.layoutOptions?.[key];
  const listed = [value ?? ''];
  const own = listed.filter((option) => option !== '');
  const children = node.children ?? [];
  const below = children.flatMap((child) => optionValuesOf(child, key));

  return [...own, ...below];
};

/** `value` repeated `count` times. */
export const repeatedOf = (count: number, value: string): string[] => Array.from({ length: count }, () => value);

/** The value of layout option `key` on each child of `node`, in order: the wrappers of a packed root. */
export const wrapperOptionValuesOf = (node: ElkNode, key: string): (string | undefined)[] => {
  const children = node.children ?? [];
  const optionOf = (child: ElkNode): string | undefined => child.layoutOptions?.[key];

  return children.map(optionOf);
};
