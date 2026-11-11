import type { GraphRunsMessage } from '../../bridge/common/graph-message.type.ts';
import { NO_AFFECTED } from '../common/graph-task.const.ts';
import type { TaskCanvas } from '../common/task-canvas.type.ts';
import { affectedUpdateOf } from '../utils/affected-record.util.ts';
import { predictionRecordOf } from '../utils/prediction-record.util.ts';

/**
 * Hands the task canvas the cache predictions and the affected marks of a `runs` message. Predictions pass as `null` while
 * absent, which the canvas skips; an absent or malformed `affected` leaves the marks, `null` clears them, an object
 * replaces them.
 */
export const applyRunMarks = (canvas: Pick<TaskCanvas, 'predictions' | 'affected'>, message: GraphRunsMessage): void => {
  const update = affectedUpdateOf(message.affected);

  canvas.predictions(predictionRecordOf(message.predictions));

  if (update === undefined) return;

  const marks = update === null ? NO_AFFECTED : update.tasks;

  canvas.affected(marks);
};
