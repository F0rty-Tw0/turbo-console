import type { GraphState } from '@turbo-console/webview-ui';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphPorts, GraphRunRequest } from '../common/graph.type.ts';

const RUN_COMMAND = 'turboConsole.runTask';
const RUN_WITHOUT_CACHE_COMMAND = 'turboConsole.runTaskWithoutCache';
const STOP_COMMAND = 'turboConsole.stopTask';

const commandOf = (request: GraphRunRequest): string => {
  if (request.type === 'stopTask') return STOP_COMMAND;

  return request.noCache ? RUN_WITHOUT_CACHE_COMMAND : RUN_COMMAND;
};

/**
 * Runs or stops a task the host listed, through the tree's run commands. The row is built from the host's `GraphTask`, so
 * the page names only an id. `false` when the state is not a graph or the id is not a listed task; a rejection of the port is
 * logged and the request still counts as handled.
 */
export async function routeRun(
  request: GraphRunRequest,
  state: GraphState,
  ports: Pick<GraphPorts, 'executeCommand' | 'log'>,
  root: string
): Promise<boolean> {
  if (state.kind !== 'graph') return false;

  const task = state.tasks.find(({ id }) => id === request.taskId);

  if (task === undefined) return false;

  const row = { kind: 'task', root, key: task.id, packageName: task.packageName };

  try {
    await ports.executeCommand(commandOf(request), row);
  } catch (error: unknown) {
    ports.log(logTextOf(error));
  }

  return true;
}
