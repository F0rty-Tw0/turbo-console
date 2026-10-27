import type { PackageNode } from '@turbo-console/core';

import { packagePathTextOf, packageTextOf, shownTextOf } from './model-view.util.ts';
import { rowIdOf } from './row-id.util.ts';
import { withRunningSuffix } from './running-count.util.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import { FOLDER_ICON, PACKAGE_ICON } from '../common/icon.const.ts';
import type { ModelView } from '../common/model-view.type.ts';
import type { RowInputs, RunningCounts, TreeRow } from '../common/tree-row.type.ts';

/**
 * Spec §4.9: the tooltip holds the directory's root-relative path and the shown packages below it at any depth. UB5a §3.3:
 * the description counts the runs below it.
 */
export const dirRow = (root: string, dir: FolderDir, view: ModelView, running: RunningCounts): TreeRow => {
  const count = view.packagesBelow.get(dir.path) ?? 0;
  const runningCount = running.dirs.get(dir.path) ?? 0;
  const description = withRunningSuffix('', runningCount);
  const row: TreeRow = {
    id: rowIdOf('dir', root, dir.path),
    kind: 'dir',
    root,
    key: dir.path,
    packageName: null,
    label: cleanText(dir.label, LABEL_MAX),
    description,
    icon: FOLDER_ICON,
    contextValue: 'turboDir',
    collapsible: 'expanded',
    tooltip: [`Path: ${dir.path}`, `Packages: ${count}`],
    command: null,
    folder: dir.path
  };

  return row;
};

/**
 * `key` and `packageName` keep the raw model name; only `label` and `description` are cleaned. The label is the cleaned
 * text `shownTextOf` returns: the full shown text or the bare text (spec §4.8). The description is the package path, or empty when it equals the label the row
 * shows (spec §4.7: descriptions never repeat the label). The tooltip always starts with the full shown text (spec §4.9) and
 * counts the visible tasks the view holds for it. UB5a §3.3: the cut path, then the count of its runs.
 */
export const packageRow = (root: string, pkg: PackageNode, view: ModelView, inputs: RowInputs): TreeRow => {
  const label = shownTextOf(view, pkg, inputs.scopeShown);
  const pathText = packagePathTextOf(pkg.path);
  const path = cleanText(pathText, DESCRIPTION_MAX);
  const shownPath = path === label ? '' : path;
  const runningCount = inputs.running.packages.get(pkg.name) ?? 0;
  const description = withRunningSuffix(shownPath, runningCount);
  const taskCount = view.visibleTaskCounts.get(pkg.name) ?? 0;
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
    tooltip: [packageTextOf(pkg), `Path: ${pathText}`, `Tasks: ${taskCount}`],
    command: null,
    folder: pkg.path
  };

  return row;
};

/**
 * The rows of one level of the folders view: the child directory rows first, then the package rows (a `FolderDir` is a
 * level too, so this serves the top level and a directory's children alike). A package the view lacks is skipped.
 */
export const dirRows = (root: string, level: FolderTree, view: ModelView, inputs: RowInputs): TreeRow[] => {
  const dirs = level.dirs.map((dir) => dirRow(root, dir, view, inputs.running));
  const found = level.packages.map((name) => view.packages.get(name));
  const listed = found.filter((pkg) => pkg !== undefined);
  const leafOf = (pkg: PackageNode): TreeRow => packageRow(root, pkg, view, inputs);
  const leaves = listed.map(leafOf);

  return [...dirs, ...leaves];
};
