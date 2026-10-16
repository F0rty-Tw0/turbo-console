import type { PackageNode, RunMatch, TaskNode } from '@turbo-console/core';
import { durationText } from '@turbo-console/webview-ui';

import { rowIdOf } from './row-id.util.ts';
import { taskDisplay } from './task-display.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { settledMatchOf } from '../../run/utils/run-result.util.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { CONTINUOUS_KIND_LINES, NOT_TURBO_KIND_LINES } from '../common/task-text.const.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';

export const isVisibleTask = (task: TaskNode): boolean => task.kind !== 'atom-file';

/** Spec 1c-a §4.1: only a visible task some turbo config defines is offered to Run, Copy and the pickers. */
export const isRunnableTask = (task: TaskNode): boolean => isVisibleTask(task) && task.isTurboTask;

const NO_LINES: string[] = [];

const CACHE_LINES: Readonly<Record<NonNullable<RunMatch['cache']>, string>> = {
  HIT: 'Cache: replayed from cache',
  MISS: 'Cache: not cached, ran'
};

const lineOf = (line: string | null): string[] => {
  if (line === null) return [];

  return [line];
};

const labelled = (label: string, value: string | number | null): string | null => {
  if (value === null) return null;

  return `${label}: ${value}`;
};

const timeLine = (label: string, at: number | null): string | null => {
  if (at === null) return null;

  return labelled(label, new Date(at).toISOString());
};

const kindLines = (task: TaskNode): string[] => {
  if (!task.isTurboTask) return NOT_TURBO_KIND_LINES;

  return task.persistent ? CONTINUOUS_KIND_LINES : NO_LINES;
};

const taskFactLines = (task: TaskNode): string[] => {
  const command = labelled('Command', task.command);
  const kind = labelled('Kind', task.kind);
  const lines = [task.description, command, kind];

  return lines.flatMap(lineOf);
};

const matchLines = (match: RunMatch | null): string[] => {
  if (match === null) return [];

  const duration = labelled('Duration', durationText(match.durationMs));
  const cache = match.cache === null ? null : CACHE_LINES[match.cache];
  const lines = [duration, cache];

  return lines.flatMap(lineOf);
};

/**
 * Spec 1c-a §4.5 run lines: the start time always; a stopped run adds its end time; a passed or failed run adds exit
 * code, duration and cache (each only when known) before both times.
 */
const runLines = (entry: RunEntry | undefined): string[] => {
  if (entry === undefined) return [];

  const { state } = entry;
  const started = timeLine('Started', entry.launchedAt);

  if (state === 'running' || state === 'failed-to-start') return lineOf(started);

  const ended = timeLine('Ended', entry.endedAt);

  const times = [started, ended];

  if (state === 'stopped') return times.flatMap(lineOf);

  const exit = labelled('Exit code', entry.exitCode);
  const matched = matchLines(settledMatchOf(entry));
  const lines = [exit, ...matched, ...times];

  return lines.flatMap(lineOf);
};

const taskRow = (root: string, pkg: PackageNode, task: TaskNode, context: RowContext): TreeRow => {
  const entry = context.runs(root, task.id);
  const display = taskDisplay(task, entry, context.now);
  const kind = kindLines(task);
  const facts = taskFactLines(task);
  const ran = runLines(entry);
  const tooltip = [...kind, ...facts, ...ran];
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
 * The visible tasks of a package (`atom-file` tasks stay hidden), each with its last run's state read at the context's
 * wall clock. Tooltip lines are raw text: `tooltipMarkdownOf` cleans them. The description is built from numbers and
 * fixed words, but is cleaned like every label.
 */
export const taskRows = (root: string, pkg: PackageNode, context: RowContext): TreeRow[] => {
  const visible = pkg.tasks.filter(isVisibleTask);

  return visible.map((task) => taskRow(root, pkg, task, context));
};

/** The row of the visible task `taskId` of `pkg`, built alone; a hidden or unknown id has none. */
export const taskRowOf = (root: string, pkg: PackageNode, taskId: string, context: RowContext): TreeRow | undefined => {
  const isShownTask = (task: TaskNode): boolean => task.id === taskId && isVisibleTask(task);
  const task = pkg.tasks.find(isShownTask);

  if (task === undefined) return undefined;

  return taskRow(root, pkg, task, context);
};
