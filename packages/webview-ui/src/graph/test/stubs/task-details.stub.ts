import { GRAPH_TASK_STUB } from './graph-task.stub.ts';
import type { TaskDetailsModel } from '../../common/task-details.type.ts';

/** `a#build` selected, idle, with no dependency or dependent shown. */
export const TASK_DETAILS_STUB: TaskDetailsModel = {
  task: GRAPH_TASK_STUB,
  state: null,
  dependencies: [],
  dependents: [],
  rootLabel: null
};
