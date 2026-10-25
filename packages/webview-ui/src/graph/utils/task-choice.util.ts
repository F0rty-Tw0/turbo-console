import { umbrellaSizeOf } from './atom-size.util.ts';
import { taskLayoutKeyOf } from './elk-task-graph.util.ts';
import { droppedTasksText } from './task-text.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { MAX_TASK_DEPTH, MIN_TASK_DEPTH } from '../common/graph-task.const.ts';
import type { TaskChoice, TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';

const WHOLE_DIGITS = /^\d+$/;

export const choiceOf = (tasks: GraphTask[], taskIds: string[]): TaskChoice => {
  const known = new Set(tasks.map((task) => task.id));
  const distinct = new Set(taskIds);
  const asked = [...distinct];
  const chosen = asked.filter((id) => known.has(id));
  const choice: TaskChoice = { chosen, dropped: asked.length - chosen.length };

  return choice;
};

/** A whole number from `MIN_TASK_DEPTH` to `MAX_TASK_DEPTH`, digits only; anything else is `null`. */
export const taskDepthOf = (text: string): number | null => {
  const isWhole = WHOLE_DIGITS.test(text);

  if (!isWhole) return null;

  const depth = Number(text);
  const isInRange = depth >= MIN_TASK_DEPTH && depth <= MAX_TASK_DEPTH;

  return isInRange ? depth : null;
};

/** Whether the task's name, package or id holds `search`, ignoring case; an empty search matches every task. */
export const matchesTaskSearch = (task: GraphTask, search: string): boolean => {
  const needle = search.toLowerCase();
  const fields = [task.name, task.packageName, task.id];

  return fields.some((field) => field.toLowerCase().includes(needle));
};

/**
 * The tasks the shown set draws, in the order given, the key of their layout and the size of each drawn umbrella (a task
 * with a file count in `fileCounts`); the key holds those counts, so a changed file count lays out afresh.
 */
export const requestOf = (
  tasks: GraphTask[],
  shownSet: ShownSet,
  fileCounts: ReadonlyMap<string, number>,
  sizeOf: NodeSizer
): TaskLayoutRequest => {
  const shown = new Set(shownSet.ids);
  const drawn = tasks.filter((task) => shown.has(task.id));
  const sizes = new Map<string, NodeSize>();

  for (const task of drawn) {
    const fileCount = fileCounts.get(task.id);

    if (fileCount !== undefined) sizes.set(task.id, umbrellaSizeOf(sizeOf, task.name, fileCount));
  }

  const key = taskLayoutKeyOf(drawn, shown, fileCounts);
  const request: TaskLayoutRequest = { tasks: drawn, shown, key, sizes };

  return request;
};

/** The ids of package `name`'s tasks, in the task list order. */
export const packageTaskIdsOf = (tasks: GraphTask[], name: string): string[] => {
  const owned = tasks.filter((task) => task.packageName === name);

  return owned.map((task) => task.id);
};

/** The notice for `dropped` chosen ids that match no task; none for 0. */
export const droppedNoticeOf = (dropped: number): string | null => {
  if (dropped === 0) return null;

  return droppedTasksText(dropped);
};
