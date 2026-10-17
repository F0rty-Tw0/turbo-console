import type { PackageNode, TaskNode } from '@turbo-console/core';

import { liveOf } from './live-of.util.ts';
import { rowIdOf } from './row-id.util.ts';
import { isLiveScript, isVisibleScript } from './script-task.util.ts';
import { byName } from './task-filter.util.ts';
import { taskRow } from './task-row.util.ts';
import { sourceText } from '../../run/utils/source-text.util.ts';
import { SCRIPTS_ICON } from '../common/icon.const.ts';
import { SCRIPTS_LABEL } from '../common/task-text.const.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { RowScope, TreeRow } from '../common/tree-row.type.ts';

/** Spec 1c-b §4.6: every visible script while scripts are shown; while hidden, only those with a live run under the folder root. */
const heldScripts = (scope: RowScope, pkg: PackageNode, context: RowContext): TaskNode[] => {
  const liveOfRoot = liveOf(context, scope.root);
  const holdsNone = !context.scriptsShown && liveOfRoot.size === 0;

  if (holdsNone) return [];

  const isHeld = (task: TaskNode): boolean => {
    const isShown = context.scriptsShown && isVisibleScript(task);

    return isShown || isLiveScript(task, liveOfRoot);
  };

  return pkg.tasks.filter(isHeld);
};

/** The rows under a package's Scripts group, sorted by name; a refused name keeps its row. */
export const scriptRows = (scope: RowScope, pkg: PackageNode, context: RowContext): TreeRow[] => {
  const held = heldScripts(scope, pkg, context).toSorted(byName);

  return held.map((task) => taskRow(scope, pkg, task, context));
};

/** The Scripts group of a package, counting the rows it holds; `null` when it holds none. */
export const groupRowOf = (scope: RowScope, pkg: PackageNode, context: RowContext): TreeRow | null => {
  const { root, packageManager } = scope;
  const held = heldScripts(scope, pkg, context);

  if (held.length === 0) return null;

  const runner = `${packageManager.name} ${sourceText(packageManager.source)}`;
  const row: TreeRow = {
    id: rowIdOf('scripts', root, pkg.name),
    kind: 'scripts',
    root,
    key: pkg.name,
    packageName: pkg.name,
    label: SCRIPTS_LABEL,
    description: String(held.length),
    icon: SCRIPTS_ICON,
    contextValue: 'turboGroup',
    collapsible: 'collapsed',
    tooltip: [`Runs with ${runner}`],
    command: null
  };

  return row;
};
