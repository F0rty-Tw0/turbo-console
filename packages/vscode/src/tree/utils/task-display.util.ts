import type { TaskNode } from '@turbo-console/core';
import { durationText, elapsedText } from '@turbo-console/webview-ui';

import type { RunEntry } from '../../run/common/run.type.ts';
import { settledMatchOf } from '../../run/utils/run-result.util.ts';
import {
  CONTINUOUS_IDLE_ICON,
  CONTINUOUS_RUNNING_ICON,
  FAILED_ICON,
  IDLE_ICON,
  PASSED_ICON,
  RUNNING_ICON,
  STOPPED_ICON
} from '../common/icon.const.ts';
import type { EndedState, IconSpec, RunningKind, TaskContextValue, TaskDisplay } from '../common/tree-row.type.ts';

const IDLE: TaskDisplay = { icon: IDLE_ICON, description: '', contextValue: 'turboTask' };

const CONTINUOUS_IDLE: TaskDisplay = { icon: CONTINUOUS_IDLE_ICON, description: 'continuous', contextValue: 'turboTask' };

const SCRIPT_IDLE: TaskDisplay = { icon: IDLE_ICON, description: '', contextValue: 'turboScript' };

const TURBO_RUNNING: RunningKind = { icon: RUNNING_ICON, prefix: 'running' };

const CONTINUOUS_RUNNING: RunningKind = { icon: CONTINUOUS_RUNNING_ICON, prefix: 'continuous' };

const ENDED_ICONS: Readonly<Record<EndedState, IconSpec>> = {
  passed: PASSED_ICON,
  failed: FAILED_ICON,
  stopped: STOPPED_ICON,
  'failed-to-start': FAILED_ICON
};

const exitText = (exitCode: number | null): string => (exitCode === null ? 'no exit code' : `exit ${exitCode}`);

/** The click-to-end time of a run that has ended; a script has no run summary, so this is its duration. */
const durationOf = (entry: RunEntry): string | null => {
  const { endedAt } = entry;

  if (endedAt === null) return null;

  return durationText(endedAt - entry.launchedAt);
};

const passedText = (entry: RunEntry): string => {
  if (!entry.task.isTurboTask) return durationOf(entry) ?? 'exit 0';

  const match = settledMatchOf(entry);

  if (match === null) return 'exit 0';

  const duration = durationText(match.durationMs);

  return match.cache === 'HIT' ? `${duration} · cached` : duration;
};

const failedText = (entry: RunEntry): string => {
  const exit = exitText(entry.exitCode);
  const match = settledMatchOf(entry);

  return match === null ? exit : `${exit} · ${durationText(match.durationMs)}`;
};

/** A stopped run is never matched: its length is click to end. */
const stoppedText = (entry: RunEntry): string => {
  const duration = durationOf(entry);

  if (duration === null) return 'stopped';

  return `stopped · ${duration}`;
};

const failedToStartText = (): string => 'failed to start';

const ENDED_TEXTS: Readonly<Record<EndedState, (entry: RunEntry) => string>> = {
  passed: passedText,
  failed: failedText,
  stopped: stoppedText,
  'failed-to-start': failedToStartText
};

const idleDisplayOf = (task: TaskNode): TaskDisplay => {
  if (!task.isTurboTask) return SCRIPT_IDLE;

  return task.persistent ? CONTINUOUS_IDLE : IDLE;
};

/**
 * A script run is never continuous. For a turbo run the current kind decides; a node that turned non-turbo mid-run has
 * no running kind, so the launch node decides.
 */
export const runningKindOf = (task: TaskNode, entry: RunEntry): RunningKind => {
  if (!entry.task.isTurboTask) return TURBO_RUNNING;

  const isContinuous = task.isTurboTask ? task.persistent : entry.task.persistent;

  return isContinuous ? CONTINUOUS_RUNNING : TURBO_RUNNING;
};

/** The current kind decides: a script now offers Run and Copy; only a matched cache hit offers the cached actions. */
const endedContextOf = (task: TaskNode, entry: RunEntry): TaskContextValue => {
  if (!task.isTurboTask) return 'turboScript';

  const isCached = entry.state === 'passed' && settledMatchOf(entry)?.cache === 'HIT';

  return isCached ? 'turboTask.cached' : 'turboTask';
};

/** The kind at launch decides: a mid-run kind change runs the next run the new way. */
const runningContextOf = (entry: RunEntry): TaskContextValue => (entry.task.isTurboTask ? 'turboTask.running' : 'turboScript.running');

const runningDisplayOf = (task: TaskNode, entry: RunEntry, now: number): TaskDisplay => {
  const { icon, prefix } = runningKindOf(task, entry);
  const description = `${prefix} · ${elapsedText(now - entry.launchedAt)}`;
  const display: TaskDisplay = { icon, description, contextValue: runningContextOf(entry) };

  return display;
};

/**
 * Spec 1c-a §4.5 and 1c-b §4.5: icon, description and context value of a task item. The kind comes from `task`, the current model
 * node; a live run always shows its clock (`now − launchedAt`, wall clock) and offers Stop, whatever the kind says now.
 */
export const taskDisplay = (task: TaskNode, entry: RunEntry | undefined, now: number): TaskDisplay => {
  if (entry === undefined) return idleDisplayOf(task);

  const { state } = entry;

  if (state === 'running') return runningDisplayOf(task, entry, now);

  const description = ENDED_TEXTS[state](entry);
  const contextValue = endedContextOf(task, entry);
  const display: TaskDisplay = { icon: ENDED_ICONS[state], description, contextValue };

  return display;
};
