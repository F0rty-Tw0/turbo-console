import { runSummarySchema } from '../../../shared/turbo/common/run-summary.schema.ts';
import type { RunSummaryTask } from '../../../shared/turbo/common/turbo.type.ts';
import { B } from '../common/atom-results.const.ts';

/** The task without its `cache` when it is B, so `runSummarySchema` rejects the whole summary. */
const withoutCacheOfB = (task: RunSummaryTask): Partial<RunSummaryTask> => {
  if (task.taskId !== B) return task;

  const { taskId, execution } = task;

  const stripped = { taskId, execution };

  return stripped;
};

/** The run 5 text with the `cache` of its B entry removed. */
export const brokenRun5 = (text: string): string => {
  const json: unknown = JSON.parse(text);
  const summary = runSummarySchema.parse(json);
  const tasks = summary.tasks.map(withoutCacheOfB);
  const broken = { ...summary, tasks };

  return JSON.stringify(broken);
};
