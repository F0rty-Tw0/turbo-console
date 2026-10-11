import { z } from 'zod';

const executionSchema = z.object({ startTime: z.number(), endTime: z.number(), exitCode: z.number() });

const cacheSchema = z.object({ status: z.enum(['HIT', 'MISS']) });

const taskSchema = z.object({ taskId: z.string(), execution: executionSchema, cache: cacheSchema });

/**
 * A `.turbo/runs/<id>.json` file written by `turbo run --summarize`. Times are epoch milliseconds. Unknown keys are
 * stripped; every listed key is required.
 */
export const runSummarySchema = z.object({ id: z.string(), execution: executionSchema, tasks: z.array(taskSchema) });
