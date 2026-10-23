import type { GraphTask } from '@turbo-console/webview-ui';

import type { GraphRunCommand, GraphRunRequest } from '../common/graph.type.ts';

const RUN_COMMANDS: Readonly<Record<GraphRunRequest['type'], string>> = {
  runTask: 'turboConsole.runTask',
  stopTask: 'turboConsole.stopTask'
};

const RUN_WITHOUT_CACHE_COMMAND = 'turboConsole.runTaskWithoutCache';

/**
 * The tree's command for a graph request, with the task row it takes. The row is built from the host's `GraphTask` and the
 * session's `root`, so the page names only an id.
 */
export const runCommandOf = (request: GraphRunRequest, task: GraphTask, root: string): GraphRunCommand => {
  const isWithoutCache = request.type === 'runTask' && request.noCache;
  const command = isWithoutCache ? RUN_WITHOUT_CACHE_COMMAND : RUN_COMMANDS[request.type];
  const row = { kind: 'task', root, key: task.id, packageName: task.packageName };
  const runCommand: GraphRunCommand = { command, arg: row };

  return runCommand;
};
