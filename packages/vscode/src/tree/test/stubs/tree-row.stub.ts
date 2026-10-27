import { PACKAGE_ICON } from '../../common/icon.const.ts';
import type { RowInputs, RunningCounts, TreeRow } from '../../common/tree-row.type.ts';

export const TREE_ROW_STUB: TreeRow = {
  id: 'pkg:/ws\0a',
  kind: 'pkg',
  root: '/ws',
  key: 'a',
  packageName: 'a',
  label: 'a',
  description: 'packages/a',
  icon: PACKAGE_ICON,
  contextValue: 'turboPackage',
  collapsible: 'collapsed',
  tooltip: [],
  command: null
};

/** Nothing runs. */
export const RUNNING_COUNTS_STUB: RunningCounts = { packages: new Map(), dirs: new Map() };

/** Bare labels, nothing runs. */
export const ROW_INPUTS_STUB: RowInputs = { scopeShown: false, running: RUNNING_COUNTS_STUB };
