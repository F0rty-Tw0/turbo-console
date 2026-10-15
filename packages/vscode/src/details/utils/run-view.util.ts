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
 * `codicon-modifier-spin`.
 */
export const toRunView = (entry: RunEntry | undefined): RunView => {
  const { icon, description } = taskDisplay(entry);
  const isRunning = entry?.state === 'running';
  const view: RunView = {
    iconId: icon.id.replace(SPIN_MODIFIER, ''),
    colorVar: colorVarOf(icon.color),
    text: description,
    isRunning
  };

  return view;
};
