import { array, boolean, number, object, string, enum as zodEnum } from 'zod/mini';

const executionSchema = object({ startTime: number(), endTime: number(), exitCode: number() });

/**
 * The summary-level execution; unlike a task's, turbo also records the `command` line it ran and how many tasks it
 * `attempted` and saw end as `success`, `failed` or `cached`.
 */
const runExecutionSchema = object({
  command: string(),
  attempted: number(),
  success: number(),
  failed: number(),
  cached: number(),
  startTime: number(),
  endTime: number(),
  exitCode: number()
});

const cacheSchema = object({ status: zodEnum(['HIT', 'MISS']) });

const taskSchema = object({ taskId: string(), execution: executionSchema, cache: cacheSchema });

/**
 * A `.turbo/runs/<id>.json` file written by `turbo run --summarize`. Times are epoch milliseconds. Unknown keys are
 * stripped; every listed key is required. A `monorepo: false` summary has bare `taskId`s; `readRunSummaryFile` rewrites
 * them.
 */
export const runSummarySchema = object({
  id: string(),
  monorepo: boolean(),
  execution: runExecutionSchema,
  tasks: array(taskSchema)
});
