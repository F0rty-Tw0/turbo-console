import { PACKAGE_ICON } from '../../common/icon.const.ts';
import type { TreeRow } from '../../common/tree-row.type.ts';

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
