import type { GraphWebviewMessage } from '../../bridge/common/graph-message.type.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { LatestRuns, TaskDetailsModel, TaskOwners, TaskRunAction, TaskRuns } from '../common/task-details.type.ts';

/** The task's state in the latest `runs` map; an own key only, so `toString` or `__proto__` never reads as a state. */
export const runStateOf = (runs: TaskRuns, id: string): GraphRunState | null => {
  const hasState = Object.hasOwn(runs, id);

  if (!hasState) return null;

  return runs[id] ?? null;
};

/** The task id of the run that runs `id` under another task's run; an own key only, so `constructor` or `__proto__` never reads as an owner. */
const runOwnerOf = (owners: TaskOwners, id: string): string | null => {
  const hasOwner = Object.hasOwn(owners, id);

  if (!hasOwner) return null;

  return owners[id] ?? null;
};

export const taskWithId = (tasks: GraphTask[], id: string | null): GraphTask | undefined => tasks.find((task) => task.id === id);

/** Whether a run is still going: a one-shot `running` or a persistent `continuous` one. */
export const isLiveRun = (state: GraphRunState | null): boolean => state === 'running' || state === 'continuous';

const liveRunOwnerOf = (state: GraphRunState | null, owners: TaskOwners, id: string): string | null => {
  const isLive = isLiveRun(state);

  if (!isLive) return null;

  return runOwnerOf(owners, id);
};

/**
 * The panel model of `task`: its run state, its direct dependencies that are in `shown`, in its dependency order, the
 * shown tasks that directly depend on it, in the shown order, the root label, and the run owner while the task is live.
 */
export const taskDetailsModelOf = (
  task: GraphTask,
  shown: GraphTask[],
  latest: LatestRuns,
  rootLabel: string | null
): TaskDetailsModel => {
  const shownOf = (id: string): GraphTask | undefined => taskWithId(shown, id);
  const found = task.dependencies.map(shownOf);
  const dependencies = found.filter((dependency) => dependency !== undefined);
  const dependents = shown.filter((other) => other.dependencies.includes(task.id));
  const state = runStateOf(latest.runs, task.id);
  const runOwner = liveRunOwnerOf(state, latest.owners, task.id);
  const model: TaskDetailsModel = { task, state, runOwner, dependencies, dependents, rootLabel };

  return model;
};

const stopMessageOf = (model: TaskDetailsModel): GraphWebviewMessage | null => {
  const isLive = isLiveRun(model.state);

  if (!isLive) return null;

  const taskId = model.runOwner ?? model.task.id;
  const message: GraphWebviewMessage = { type: 'stopTask', taskId };

  return message;
};

/**
 * The message a run button posts for the shown task: Run and Run without cache only for a runnable task, Stop only
 * while it runs; nothing with no task shown, so a stale button never posts.
 */
export const runMessageOf = (model: TaskDetailsModel | null, action: TaskRunAction): GraphWebviewMessage | null => {
  if (model === null) return null;

  if (action === 'stop') return stopMessageOf(model);

  const { id: taskId, isRunnable } = model.task;

  if (!isRunnable) return null;

  const message: GraphWebviewMessage = { type: 'runTask', taskId, noCache: action === 'runNoCache' };

  return message;
};
