import { TASK_CAP } from '@turbo-console/webview-ui';

/** The warning when Show All Task Graphs meets more tasks than task mode draws without slowing. */
export const manyTasksTextOf = (count: number): string => {
  return `This workspace has ${count} tasks. Drawing more than ${TASK_CAP} can be slow.`;
};

/** The button of that warning that draws every task. */
export const showAllLabelOf = (count: number): string => `Show all ${count}`;
