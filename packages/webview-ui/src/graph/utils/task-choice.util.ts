import { taskLayoutKeyOf } from './elk-task-graph.util.ts';
import { droppedTasksText } from './task-text.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { MAX_TASK_DEPTH, MIN_TASK_DEPTH } from '../common/graph-task.const.ts';
import type { TaskChoice, TaskLayoutRequest } from '../common/graph-task.type.ts';
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

/** The tasks the shown set draws, in the order given, and the key of their layout. */
export const requestOf = (tasks: GraphTask[], shownSet: ShownSet): TaskLayoutRequest => {
  const shown = new Set(shownSet.ids);
  const drawn = tasks.filter((task) => shown.has(task.id));
  const request: TaskLayoutRequest = { tasks: drawn, shown, key: taskLayoutKeyOf(drawn, shown) };

  return request;
};

/** The notice for `dropped` chosen ids that match no task; none for 0. */
export const droppedNoticeOf = (dropped: number): string | null => {
  if (dropped === 0) return null;

  return droppedTasksText(dropped);
};
