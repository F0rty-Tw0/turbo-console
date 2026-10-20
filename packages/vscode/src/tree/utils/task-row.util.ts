import type { PackageManagerName, PackageNode, RunMatch, TaskNode } from '@turbo-console/core';
import { durationText } from '@turbo-console/webview-ui';

import { rowIdOf } from './row-id.util.ts';
import { taskDisplay } from './task-display.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { settledMatchOf } from '../../run/utils/run-result.util.ts';
import { scriptCommandOf } from '../../run/utils/script-name.util.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { ToolMatch } from '../../tool/common/tool.type.ts';
import { toolTitleOf } from '../../tool/utils/package-scripts.util.ts';
import { toolIconIdOf } from '../../tool/utils/tool-of.util.ts';
import { IDLE_ICON } from '../common/icon.const.ts';
import { CONTINUOUS_KIND_LINES } from '../common/task-text.const.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { IconSpec, RowScope, TaskDisplay, TreeRow } from '../common/tree-row.type.ts';

const NO_LINES: string[] = [];

const CACHE_LINES: Readonly<Record<NonNullable<RunMatch['cache']>, string>> = {
  HIT: 'Cache: replayed from cache',
  MISS: 'Cache: not cached, ran'
};

const FORCED_CACHE_LINE = 'Cache: skipped (Run Without Cache)';

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
  if (!task.isTurboTask) return NO_LINES;

  return task.persistent ? CONTINUOUS_KIND_LINES : NO_LINES;
};

const toolLineTextOf = (match: ToolMatch | null): string | null => {
  if (match === null) return null;

  return toolTitleOf(match);
};

/**
 * A turbo task shows its body as `Command`; a script shows what runs it (left out when refused), then its body as `Script`.
 * The `Tool` line follows the body, so a refused script still has it.
 */
const commandLinesOf = (task: TaskNode, manager: PackageManagerName, match: ToolMatch | null): (string | null)[] => {
  const toolLine = labelled('Tool', toolLineTextOf(match));

  if (task.isTurboTask) return [labelled('Command', task.command), toolLine];

  const command = labelled('Command', scriptCommandOf(manager, task.name));
  const script = labelled('Script', task.command);

  return [command, script, toolLine];
};

const taskFactLines = (task: TaskNode, manager: PackageManagerName, match: ToolMatch | null): string[] => {
  const commands = commandLinesOf(task, manager, match);
  const kind = labelled('Kind', task.kind);
  const lines = [task.description, ...commands, kind];

  return lines.flatMap(lineOf);
};

const cacheLineOf = (match: RunMatch, force: boolean): string | null => {
  if (match.cache === null) return null;

  if (force && match.cache === 'MISS') return FORCED_CACHE_LINE;

  return CACHE_LINES[match.cache];
};

const matchLines = (match: RunMatch | null, force: boolean): string[] => {
  if (match === null) return [];

  const duration = labelled('Duration', durationText(match.durationMs));
  const cache = cacheLineOf(match, force);
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
  const matched = matchLines(settledMatchOf(entry), entry.force);
  const lines = [exit, ...matched, ...times];

  return lines.flatMap(lineOf);
};

const iconIdOfTool = (match: ToolMatch | null): string | null => {
  if (match === null) return null;

  return toolIconIdOf(match.tool);
};

/** Spec 1c-c §4.6: the lowest rung. Only the idle wrench gives way to the tool's logo; run state and kind icons win. */
const toolIcon = (display: TaskDisplay, entry: RunEntry | undefined, match: ToolMatch | null): IconSpec => {
  const iconId = iconIdOfTool(match);
  const isIdleWrench = entry === undefined && display.icon.id === IDLE_ICON.id;

  if (!isIdleWrench || iconId === null) return display.icon;

  const icon: IconSpec = { id: iconId, color: null };

  return icon;
};

/** Tooltip lines are raw text: `tooltipMarkdownOf` cleans them. The description is built from numbers and fixed words, but is cleaned like every label. */
export const taskRow = (scope: RowScope, pkg: PackageNode, task: TaskNode, context: RowContext): TreeRow => {
  const { root, packageManager, singlePackage } = scope;
  const entry = context.runs(root, task.id);
  const display = taskDisplay(task, entry, context.now);
  const match = context.tools(pkg, singlePackage, task.command);
  const kind = kindLines(task);
  const facts = taskFactLines(task, packageManager.name, match);
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
    icon: toolIcon(display, entry, match),
    contextValue: display.contextValue,
    collapsible: 'none',
    tooltip,
    command: null
  };

  return row;
};
