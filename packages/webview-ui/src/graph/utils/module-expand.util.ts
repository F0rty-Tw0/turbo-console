import type { ModuleDir, ModuleTree } from '../common/module-tree.type.ts';

const expandedUnder = (dir: ModuleDir): string[] => {
  const [only, second] = dir.dirs;
  const isExpanded = only !== undefined && second === undefined && only.files.length === 0;

  if (!isExpanded) return [];

  const nested = expandedUnder(only);

  return [only.path, ...nested];
};

/**
 * The folders open by default (D9): a folder is open when its parent is open, it is the parent's only child folder, and
 * it holds no files directly. The root is always open and never listed; parents come before their children.
 */
export const defaultExpandedOf = (tree: ModuleTree): string[] => expandedUnder(tree.root);
