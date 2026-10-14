import type { TreeMode } from '../common/tree-row.type.ts';

/** The `turboConsole.treeMode` setting as a mode: a user can type any JSON there, and anything but `list` is `folders`. */
export const treeModeOf = (value: unknown): TreeMode => {
  if (value === 'list') return 'list';

  return 'folders';
};
