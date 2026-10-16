import type { PackageNode, RunMatch, TaskNode } from '@turbo-console/core';

import { rowIdOf } from './row-id.util.ts';
import { taskDisplay } from './task-display.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { secondsText, settledMatchOf } from '../../run/utils/run-result.util.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';

export const isVisibleTask = (task: TaskNode): boolean => task.kind !== 'atom-file';

const lineOf = (line: string | null): string[] => {
  if (line === null) return [];

  return [line];
};

const labelled = (label: string, value: string | number | null): string | null => {
  if (value === null) return null;

  return `${label}: ${value}`;
};

const taskFactLines = (task: TaskNode): string[] => {
  const command = labelled('Command', task.command);
  const kind = labelled('Kind', task.kind);
  const lines = [task.description, command, kind];

  return lines.flatMap(lineOf);
};

const matchLines = (match: RunMatch | null): string[] => {
  if (match === null) return [];

  const duration = labelled('Duration', secondsText(match.durationMs));
  const cache = labelled('Cache', match.cache);
  const lines = [duration, cache];

  return lines.flatMap(lineOf);
};

/** Exit code, duration, cache and end time of an ended run, each only when known; a running run has none yet. */
const runLines = (entry: RunEntry | undefined): string[] => {
  if (entry === undefined) return [];

  const { endedAt } = entry;

  if (endedAt === null) return [];

  const exit = labelled('Exit code', entry.exitCode);
  const matched = matchLines(settledMatchOf(entry));
  const ended = labelled('Ended', new Date(endedAt).toISOString());
  const lines = [exit, ...matched, ended];

  return lines.flatMap(lineOf);
};

const taskRow = (root: string, pkg: PackageNode, task: TaskNode, runs: RunLookup): TreeRow => {
  const entry = runs(root, task.id);
  const display = taskDisplay(entry);
  const facts = taskFactLines(task);
  const ran = runLines(entry);
  const tooltip = [...facts, ...ran];
  const row: TreeRow = {
    id: rowIdOf('task', root, task.id),
    kind: 'task',
    root,
    key: task.id,
    packageName: pkg.name,
    label: cleanText(task.name, LABEL_MAX),
    description: cleanText(display.description, DESCRIPTION_MAX),
    icon: display.icon,
    contextValue: display.contextValue,
    collapsible: 'none',
    tooltip,
    command: null
  };

  return row;
};

/**
 * The visible tasks of a package (`atom-file` tasks stay hidden), each with its last run's state. Tooltip lines are raw
 * text: `tooltipOf` cleans them. The description is built from numbers and fixed words, but is cleaned like every label.
 */
export const taskRows = (root: string, pkg: PackageNode, context: RowContext): TreeRow[] => {
  const visible = pkg.tasks.filter(isVisibleTask);

  return visible.map((task) => taskRow(root, pkg, task, context.runs));
};
