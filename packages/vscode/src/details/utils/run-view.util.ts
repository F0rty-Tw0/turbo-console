import type { TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { RunView } from '@turbo-console/webview-ui';

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

/** A view is running exactly when it has an elapsed time. */
const viewOf = (icon: IconSpec, text: string, elapsedMs: number | null): RunView => {
  const isSpinning = icon.id.endsWith(SPIN_MODIFIER);
  const view: RunView = {
    iconId: icon.id.replace(SPIN_MODIFIER, ''),
    colorVar: colorVarOf(icon.color),
    text,
    isRunning: elapsedMs !== null,
    elapsedMs,
    isSpinning
  };

  return view;
};

/**
 * What the details page shows for a task's run. `iconId` and `colorVar` come only from the tree's fixed icon tables
 * (`runningKindOf` / `taskDisplay`), never from repo text; the spin modifier becomes `isSpinning`, which the page turns
 * back into `codicon-modifier-spin`. While running, the page draws the clock from `elapsedMs`, so `text` is the kind
 * prefix only. `task` is the current model node (its kind), `now` the wall clock.
 */
export const toRunView = (task: TaskNode, entry: RunEntry | undefined, now: number): RunView => {
  if (entry?.state === 'running') {
    const { icon, prefix } = runningKindOf(task, entry);
    const elapsedMs = Math.max(0, now - entry.launchedAt);

    return viewOf(icon, prefix, elapsedMs);
  }

  const { icon, description } = taskDisplay(task, entry, now);

  return viewOf(icon, description, null);
};

/** The run view of `entry` against its current model node; the node it was launched with once the model or the task is gone. */
export const liveRunViewOf = (model: WorkspaceModel | null, entry: RunEntry, now: number): RunView => {
  const pkg = model?.packages.find((candidate) => candidate.name === entry.packageName);
  const current = pkg?.tasks.find((candidate) => candidate.id === entry.taskId);

  return toRunView(current ?? entry.task, entry, now);
};
