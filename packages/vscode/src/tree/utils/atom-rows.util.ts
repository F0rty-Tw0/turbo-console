import type { AtomFile, AtomGroup, AtomResult, PackageNode } from '@turbo-console/core';

import { fileDescription, fileTooltip, umbrellaCounts } from './atom-text.util.ts';
import { rowIdOf } from './row-id.util.ts';
import { taskDisplay } from './task-display.util.ts';
import { taskRow } from './task-row.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { OPEN_SPEC_COMMAND } from '../common/atom.const.ts';
import { FAILED_ICON, PASSED_ICON, SPEC_FILE_ICON } from '../common/icon.const.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type {
  AtomFileContextValue,
  IconSpec,
  RowCommand,
  RowScope,
  TaskContextValue,
  TaskDisplay,
  TaskRowArg,
  TreeRow
} from '../common/tree-row.type.ts';

const PLAIN_FILE_CONTEXT: AtomFileContextValue = 'turboTask.atomFile';

/** A file task is a turbo task, so only the turbo values occur; a script value, which cannot, reads as the plain file value. */
const ATOM_FILE_CONTEXTS: Readonly<Partial<Record<TaskContextValue, AtomFileContextValue>>> = {
  turboTask: PLAIN_FILE_CONTEXT,
  'turboTask.cached': 'turboTask.cached.atomFile',
  'turboTask.running': 'turboTask.running.atomFile'
};

const RESULT_ICONS: Readonly<Record<AtomResult['outcome'], IconSpec>> = {
  passed: PASSED_ICON,
  failed: FAILED_ICON,
  cached: PASSED_ICON
};

const resultIconOf = (result: AtomResult | undefined): IconSpec => {
  if (result === undefined) return SPEC_FILE_ICON;

  return RESULT_ICONS[result.outcome];
};

const umbrellaDescription = (running: string, counts: string, entry: RunEntry | undefined): string => {
  if (entry?.state !== 'running') return counts;

  return `${running} · ${counts}`;
};

/** The umbrella keeps `taskRow`'s icon and context; its description counts the files, behind the running clock while it runs. */
export const umbrellaRow = (scope: RowScope, pkg: PackageNode, group: AtomGroup, context: RowContext): TreeRow => {
  const base = taskRow(scope, pkg, group.umbrella, context);
  const view = context.atoms(scope.root, pkg.name);
  const entry = context.runs(scope.root, group.umbrella.id);
  const counts = umbrellaCounts(group, view);
  const description = umbrellaDescription(base.description, counts, entry);
  const row: TreeRow = { ...base, description: cleanText(description, DESCRIPTION_MAX), collapsible: 'collapsed' };

  return row;
};

/** A running run shows its own clock; any other state, run-store ended entries included, reads the newest result. */
const shownOf = (file: AtomFile, result: AtomResult | undefined, entry: RunEntry | undefined, display: TaskDisplay): TaskDisplay => {
  if (entry?.state === 'running') return display;

  const shown: TaskDisplay = {
    icon: resultIconOf(result),
    description: fileDescription(file, result),
    contextValue: display.contextValue
  };

  return shown;
};

/** A click opens the spec; its argument holds the row's node fields, the shape every task command reads a row by. */
const openSpecCommandOf = (id: string, root: string, key: string, packageName: string): RowCommand => {
  const node: TaskRowArg = { kind: 'task', id, root, key, packageName };
  const command: RowCommand = { command: OPEN_SPEC_COMMAND, args: [node] };

  return command;
};

export const fileRow = (scope: RowScope, pkg: PackageNode, file: AtomFile, context: RowContext): TreeRow => {
  const { root } = scope;
  const { task } = file;
  const view = context.atoms(root, pkg.name);
  const result = view.results?.get(task.id);
  const entry = context.runs(root, task.id);
  const display = taskDisplay(task, entry, context.now);
  const shown = shownOf(file, result, entry, display);
  const cache = view.dryRun?.get(task.id);
  const tooltip = fileTooltip(file, result, cache);
  const id = rowIdOf('task', root, task.id);
  const command = openSpecCommandOf(id, root, task.id, pkg.name);
  const row: TreeRow = {
    id,
    kind: 'task',
    root,
    key: task.id,
    packageName: pkg.name,
    label: cleanText(file.specPath, LABEL_MAX),
    description: cleanText(shown.description, DESCRIPTION_MAX),
    icon: shown.icon,
    contextValue: ATOM_FILE_CONTEXTS[shown.contextValue] ?? PLAIN_FILE_CONTEXT,
    collapsible: 'none',
    tooltip,
    command
  };

  return row;
};

export const fileRowsOf = (scope: RowScope, pkg: PackageNode, group: AtomGroup, context: RowContext): TreeRow[] => {
  return group.files.map((file) => fileRow(scope, pkg, file, context));
};

export const packageFileRows = (scope: RowScope, pkg: PackageNode, context: RowContext): TreeRow[] => {
  const { groups } = context.atoms(scope.root, pkg.name);

  return groups.flatMap((group) => fileRowsOf(scope, pkg, group, context));
};
