import { SHOW_EVERY_TASK_LABEL } from '../common/graph-task.const.ts';

/** The cap banner's text: how many tasks the cap cut. */
export const tasksHiddenText = (hidden: number): string => `${hidden} tasks hidden`;

/** The notice when `dropped` chosen ids match no task. */
export const droppedTasksText = (dropped: number): string => `${dropped} chosen tasks no longer exist`;

/** The prompt button's text: Show every task and how many tasks it chooses. */
export const showEveryTextOf = (count: number): string => `${SHOW_EVERY_TASK_LABEL} (${count})`;
