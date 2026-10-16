import type { TaskNode } from '@turbo-console/core';
import { durationText, elapsedText } from '@turbo-console/webview-ui';

import type { RunEntry } from '../../run/common/run.type.ts';
import { settledMatchOf } from '../../run/utils/run-result.util.ts';
import {
  CONTINUOUS_IDLE_ICON,
  CONTINUOUS_RUNNING_ICON,
  FAILED_ICON,
  IDLE_ICON,
  NOT_TURBO_ICON,
  PASSED_ICON,
  RUNNING_ICON,
  STOPPED_ICON
} from '../common/icon.const.ts';
import type { EndedState, IconSpec, RunningKind, TaskContextValue, TaskDisplay } from '../common/tree-row.type.ts';

const IDLE: TaskDisplay = { icon: IDLE_ICON, description: '', contextValue: 'turboTask' };

const CONTINUOUS_IDLE: TaskDisplay = { icon: CONTINUOUS_IDLE_ICON, description: 'continuous', contextValue: 'turboTask' };

const NOT_TURBO_IDLE: TaskDisplay = { icon: NOT_TURBO_ICON, description: 'not a turbo task', contextValue: 'turboScript' };

const TURBO_RUNNING: RunningKind = { icon: RUNNING_ICON, prefix: 'running' };

const CONTINUOUS_RUNNING: RunningKind = { icon: CONTINUOUS_RUNNING_ICON, prefix: 'continuous' };

const ENDED_ICONS: Readonly<Record<EndedState, IconSpec>> = {
  passed: PASSED_ICON,
  failed: FAILED_ICON,
  stopped: STOPPED_ICON,
  'failed-to-start': FAILED_ICON
};

const exitText = (exitCode: number | null): string => (exitCode === null ? 'no exit code' : `exit ${exitCode}`);

const passedText = (entry: RunEntry): string => {
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
  const { endedAt } = entry;

  if (endedAt === null) return 'stopped';

  return `stopped · ${durationText(endedAt - entry.launchedAt)}`;
};

const failedToStartText = (): string => 'failed to start';

const ENDED_TEXTS: Readonly<Record<EndedState, (entry: RunEntry) => string>> = {
  passed: passedText,
  failed: failedText,
  stopped: stoppedText,
  'failed-to-start': failedToStartText
};

const idleDisplayOf = (task: TaskNode): TaskDisplay => {
  if (!task.isTurboTask) return NOT_TURBO_IDLE;

  return task.persistent ? CONTINUOUS_IDLE : IDLE;
};

/** The current kind decides; a node that turned non-turbo mid-run has no running kind, so the launch node decides. */
export const runningKindOf = (task: TaskNode, entry: RunEntry): RunningKind => {
  const isContinuous = task.isTurboTask ? task.persistent : entry.task.persistent;

  return isContinuous ? CONTINUOUS_RUNNING : TURBO_RUNNING;
};

/** A task that is non-turbo now loses Run and Copy once its run ended; only a matched cache hit offers the cached actions. */
const endedContextOf = (task: TaskNode, entry: RunEntry): TaskContextValue => {
  if (!task.isTurboTask) return 'turboScript';

  const isCached = entry.state === 'passed' && settledMatchOf(entry)?.cache === 'HIT';

  return isCached ? 'turboTask.cached' : 'turboTask';
};

const runningDisplayOf = (task: TaskNode, entry: RunEntry, now: number): TaskDisplay => {
  const { icon, prefix } = runningKindOf(task, entry);
  const description = `${prefix} · ${elapsedText(now - entry.launchedAt)}`;
  const display: TaskDisplay = { icon, description, contextValue: 'turboTask.running' };

  return display;
};

/**
 * Spec 1c-a §4.5: icon, description and context value of a task item. The kind comes from `task`, the current model
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
