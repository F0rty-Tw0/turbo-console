import type { TaskMessage } from '@turbo-console/webview-ui';

import { FOCUS_PACKAGE_COMMAND, SHOW_TASK_GRAPH_COMMAND } from '../../graph/common/graph.const.ts';
import type { CommandMessage, DetailsCommand, PanelKey } from '../common/details.type.ts';

const TASK_COMMANDS: Readonly<Record<TaskMessage['type'], string>> = {
  run: 'turboConsole.runTask',
  stop: 'turboConsole.stopTask',
  copy: 'turboConsole.copyCommand',
  showInTaskGraph: SHOW_TASK_GRAPH_COMMAND
};

const PACKAGE_COMMANDS: Readonly<Record<'openPackageJson' | 'focusInGraph', string>> = {
  openPackageJson: 'turboConsole.openPackageJson',
  focusInGraph: FOCUS_PACKAGE_COMMAND
};

/**
 * The tree's command for a panel button, with the tree-row argument it takes. `root` and
 * `packageName` come from the panel key only; a task message adds only its `taskId`.
 */
export const commandOf = (message: CommandMessage, key: PanelKey): DetailsCommand => {
  if (message.type === 'showOutput') {
    const show: DetailsCommand = { command: 'turboConsole.showOutput', arg: undefined };

    return show;
  }

  if (message.type === 'openPackageJson' || message.type === 'focusInGraph') {
    const packageRow = { kind: 'pkg', root: key.root, packageName: key.packageName };
    const packageCommand: DetailsCommand = { command: PACKAGE_COMMANDS[message.type], arg: packageRow };

    return packageCommand;
  }

  const taskRow = { kind: 'task', root: key.root, key: message.taskId, packageName: key.packageName };
  const task: DetailsCommand = { command: TASK_COMMANDS[message.type], arg: taskRow };

  return task;
};
