import type { RunMatch } from '@turbo-console/core';

import type { RunEntry, RunState } from '../../run/common/run.type.ts';
import { secondsText, settledMatchOf } from '../../run/utils/run-result.util.ts';
import { FAILED_ICON, IDLE_ICON, PASSED_ICON, RUNNING_ICON, STOPPED_ICON } from '../common/icon.const.ts';
import type { IconSpec, TaskContextValue, TaskDisplay } from '../common/tree-row.type.ts';

const IDLE: TaskDisplay = { icon: IDLE_ICON, description: '', contextValue: 'turboTask' };

const ICONS: Readonly<Record<RunState, IconSpec>> = {
  running: RUNNING_ICON,
  passed: PASSED_ICON,
  failed: FAILED_ICON,
  stopped: STOPPED_ICON,
  'failed-to-start': FAILED_ICON
};

const exitText = (exitCode: number | null): string => (exitCode === null ? 'no exit code' : `exit ${exitCode}`);

const passedText = (match: RunMatch | null): string => {
  if (match === null) return 'exit 0';

  const seconds = secondsText(match.durationMs);

  return match.cache === null ? seconds : `${seconds} · ${match.cache}`;
};

const failedText = (exitCode: number | null, match: RunMatch | null): string => {
  const exit = exitText(exitCode);

  return match === null ? exit : `${exit} · ${secondsText(match.durationMs)}`;
};

const descriptionOf = (entry: RunEntry): string => {
  const match = settledMatchOf(entry);

  switch (entry.state) {
    case 'running':
      return 'running…';
    case 'passed':
      return passedText(match);
    case 'failed':
      return failedText(entry.exitCode, match);
    case 'stopped':
      return 'stopped';
    case 'failed-to-start':
      return 'failed to start';
  }
};

/** Spec §4.5 step 7: icon, description and the context value (`turboTask.running` offers Stop) of a task item. */
export const taskDisplay = (entry: RunEntry | undefined): TaskDisplay => {
  if (entry === undefined) return IDLE;

  const contextValue: TaskContextValue = entry.state === 'running' ? 'turboTask.running' : 'turboTask';
  const display: TaskDisplay = { icon: ICONS[entry.state], description: descriptionOf(entry), contextValue };

  return display;
};
