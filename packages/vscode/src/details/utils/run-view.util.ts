import type { TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { RunView } from '@turbo-console/webview-ui';

import { currentTaskOf } from './current-task.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { IconSpec } from '../../tree/common/tree-row.type.ts';
import { runningKindOf, taskDisplay } from '../../tree/utils/task-display.util.ts';

const SPIN_MODIFIER = '~spin';

const VAR_PREFIX = '--vscode-';

/** `testing.iconPassed` is `--vscode-testing-iconPassed`: VS Code's CSS variable for a theme color id. */
const colorVarOf = (color: string | null): string | null => {
  if (color === null) return null;

  return `${VAR_PREFIX}${color.replaceAll('.', '-')}`;
};

/** A view is running exactly when it has an elapsed time; idle exactly when there is no run entry. */
const viewOf = (icon: IconSpec, text: string, elapsedMs: number | null, isIdle: boolean): RunView => {
  const isSpinning = icon.id.endsWith(SPIN_MODIFIER);
  const view: RunView = {
    iconId: icon.id.replace(SPIN_MODIFIER, ''),
    colorVar: colorVarOf(icon.color),
    text,
    isRunning: elapsedMs !== null,
    elapsedMs,
    isSpinning,
    isIdle
  };

  return view;
};

/**
 * What the details page shows for a task's run. `iconId` and `colorVar` come only from the tree's fixed icon tables
 * (`runningKindOf` / `taskDisplay`), never from repo text; the spin modifier becomes `isSpinning`, which the page turns
 * back into `codicon-modifier-spin`. While running, the page draws the clock from `elapsedMs`, so `text` is the kind
 * prefix only, and the icon drops the tree's running colour (polish spec 3 §4.4: running icons carry no colour of their
 * own on the page). `task` is the current model node (its kind), `now` the wall clock.
 */
export const toRunView = (task: TaskNode, entry: RunEntry | undefined, now: number): RunView => {
  if (entry?.state === 'running') {
    const { icon, prefix } = runningKindOf(task, entry);
    const colorless: IconSpec = { id: icon.id, color: null };
    const elapsedMs = Math.max(0, now - entry.launchedAt);

    return viewOf(colorless, prefix, elapsedMs, false);
  }

  const { icon, description } = taskDisplay(task, entry, now);
  const isIdle = entry === undefined;

  return viewOf(icon, description, null, isIdle);
};

/** The run view of `entry` against its current model node; the node it was launched with once the model or the task is gone. */
export const liveRunViewOf = (model: WorkspaceModel | null, entry: RunEntry, now: number): RunView => {
  const current = currentTaskOf(model, entry.packageName, entry.taskId);

  return toRunView(current ?? entry.task, entry, now);
};
