import type { TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { RunView } from '@turbo-console/webview-ui';

import type { RunEntry } from '../../run/common/run.type.ts';
import { taskDisplay } from '../../tree/utils/task-display.util.ts';

const SPIN_MODIFIER = '~spin';

const VAR_PREFIX = '--vscode-';

/** `testing.iconPassed` is `--vscode-testing-iconPassed`: VS Code's CSS variable for a theme color id. */
const colorVarOf = (color: string | null): string | null => {
  if (color === null) return null;

  return `${VAR_PREFIX}${color.replaceAll('.', '-')}`;
};

/**
 * What the details page shows for a task's run. `iconId` and `colorVar` come only from the tree's fixed icon tables
 * through `taskDisplay`, never from repo text; the spin modifier becomes `isRunning`, which the page turns back into
 * `codicon-modifier-spin`. `task` is the current model node (its kind), `now` the wall clock.
 */
export const toRunView = (task: TaskNode, entry: RunEntry | undefined, now: number): RunView => {
  const { icon, description } = taskDisplay(task, entry, now);
  const isRunning = entry?.state === 'running';
  const view: RunView = {
    iconId: icon.id.replace(SPIN_MODIFIER, ''),
    colorVar: colorVarOf(icon.color),
    text: description,
    isRunning
  };

  return view;
};

/** The run view of `entry` against its current model node; the node it was launched with once the model or the task is gone. */
export const liveRunViewOf = (model: WorkspaceModel | null, entry: RunEntry, now: number): RunView => {
  const pkg = model?.packages.find((candidate) => candidate.name === entry.packageName);
  const current = pkg?.tasks.find((candidate) => candidate.id === entry.taskId);

  return toRunView(current ?? entry.task, entry, now);
};
