import type { PackageNode } from '@turbo-console/core';

import { rowIdOf } from './row-id.util.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import { FOLDER_ICON, PACKAGE_ICON } from '../common/icon.const.ts';
import type { TreeRow } from '../common/tree-row.type.ts';

const dirRow = (root: string, dir: FolderDir): TreeRow => {
  const row: TreeRow = {
    id: rowIdOf('dir', root, dir.path),
    kind: 'dir',
    root,
    key: dir.path,
    packageName: null,
    label: cleanText(dir.label, LABEL_MAX),
    description: '',
    icon: FOLDER_ICON,
    contextValue: 'turboDir',
    collapsible: 'expanded',
    tooltip: [],
    command: null
  };

  return row;
};

/**
 * `key` and `packageName` keep the raw model name; only `label` and `description` are cleaned. The description is the
 * package path, or empty when it equals the label (spec §4.7: descriptions never repeat the label).
 */
export const packageRow = (root: string, pkg: PackageNode): TreeRow => {
  const label = cleanText(pkg.name, LABEL_MAX);
  const path = cleanText(pkg.path, DESCRIPTION_MAX);
  const description = path === label ? '' : path;
  const row: TreeRow = {
    id: rowIdOf('pkg', root, pkg.name),
    kind: 'pkg',
    root,
    key: pkg.name,
    packageName: pkg.name,
    label,
    description,
    icon: PACKAGE_ICON,
    contextValue: 'turboPackage',
    collapsible: 'collapsed',
    tooltip: [],
    command: null
  };

  return row;
};

/**
 * The rows of one level of the folders view: the child directory rows first, then the package rows (a `FolderDir` is a
 * level too, so this serves the top level and a directory's children alike). A package name the model lacks is skipped.
 */
export const dirRows = (root: string, level: FolderTree, packages: Map<string, PackageNode>): TreeRow[] => {
  const dirs = level.dirs.map((dir) => dirRow(root, dir));
  const found = level.packages.map((name) => packages.get(name));
  const listed = found.filter((pkg) => pkg !== undefined);
  const leaves = listed.map((pkg) => packageRow(root, pkg));

  return [...dirs, ...leaves];
};
