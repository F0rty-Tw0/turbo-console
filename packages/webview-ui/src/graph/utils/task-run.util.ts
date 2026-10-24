import type { GraphWebviewMessage } from '../../bridge/common/graph-message.type.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskDetailsModel, TaskRunAction, TaskRuns } from '../common/task-details.type.ts';

/** The task's state in the latest `runs` map; an own key only, so `toString` or `__proto__` never reads as a state. */
export const runStateOf = (runs: TaskRuns, id: string): GraphRunState | null => {
  const hasState = Object.hasOwn(runs, id);

  if (!hasState) return null;

  return runs[id] ?? null;
};

export const taskWithId = (tasks: GraphTask[], id: string | null): GraphTask | undefined => tasks.find((task) => task.id === id);

/** The panel model of `task`: its run state and its direct dependencies that are in `shown`, in its dependency order. */
export const taskDetailsModelOf = (task: GraphTask, shown: GraphTask[], runs: TaskRuns): TaskDetailsModel => {
  const shownOf = (id: string): GraphTask | undefined => taskWithId(shown, id);
  const found = task.dependencies.map(shownOf);
  const dependencies = found.filter((dependency) => dependency !== undefined);
  const state = runStateOf(runs, task.id);
  const model: TaskDetailsModel = { task, state, dependencies };

  return model;
};

const stopMessageOf = (model: TaskDetailsModel): GraphWebviewMessage | null => {
  if (model.state !== 'running') return null;

  const message: GraphWebviewMessage = { type: 'stopTask', taskId: model.task.id };

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
