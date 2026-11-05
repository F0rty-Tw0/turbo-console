import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphRunRequest, RequestContext, RunTarget } from '../common/graph.type.ts';
import { runCommandOf } from '../utils/graph-run-command.util.ts';

/** The package of a running entry the graph does not list, for a Stop; `undefined` for any other request or an id with no running entry. */
function unlistedTargetOf(request: GraphRunRequest, context: RequestContext): RunTarget | undefined {
  if (request.type !== 'stopTask') return undefined;

  const entry = context.feeds.runs.get(context.root, request.taskId);

  if (entry?.state !== 'running') return undefined;

  const target: RunTarget = { id: entry.taskId, packageName: entry.packageName };

  return target;
}

/**
 * Runs or stops a task through the tree's run commands. `false` when the state is not a graph, the id is not a listed task and
 * no run of it is running to stop (only a stop reaches an owner the graph does not list), or a run is asked of a task that is
 * not runnable (a stop is allowed for any listed task); a rejection of the port is logged and the request still counts as handled.
 */
export async function routeRun(request: GraphRunRequest, context: RequestContext): Promise<boolean> {
  const { state, ports, root } = context;

  if (state.kind !== 'graph') return false;

  const listed = state.tasks.find(({ id }) => id === request.taskId);
  const unlisted = unlistedTargetOf(request, context);
  const task = listed ?? unlisted;

  if (task === undefined) return false;

  const isUnrunnableRun = request.type === 'runTask' && listed?.isRunnable !== true;

  if (isUnrunnableRun) return false;

  const { command, arg } = runCommandOf(request, task, root);

  try {
    await ports.executeCommand(command, arg);
  } catch (error: unknown) {
    ports.log(logTextOf(error));
  }

  return true;
}
