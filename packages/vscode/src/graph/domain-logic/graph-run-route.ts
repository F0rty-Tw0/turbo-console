import type { GraphState } from '@turbo-console/webview-ui';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphPorts, GraphRunRequest } from '../common/graph.type.ts';
import { runCommandOf } from '../utils/graph-run-command.util.ts';

/**
 * Runs or stops a task the host listed, through the tree's run commands. `false` when the state is not a graph, the id is not a
 * listed task, or a run is asked of a task that is not runnable (a stop is allowed for any listed task); a rejection of the port
 * is logged and the request still counts as handled.
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

  const isUnrunnableRun = request.type === 'runTask' && !task.isRunnable;

  if (isUnrunnableRun) return false;

  const { command, arg } = runCommandOf(request, task, root);

  try {
    await ports.executeCommand(command, arg);
  } catch (error: unknown) {
    ports.log(logTextOf(error));
  }

  return true;
}
