import { z } from 'zod';

const cacheSchema = z.object({ status: z.enum(['HIT', 'MISS']) });

const taskSchema = z.object({
  taskId: z.string(),
  package: z.string(),
  task: z.string(),
  hash: z.string().nullable(),
  command: z.string(),
  cache: cacheSchema,
  dependencies: z.array(z.string()),
  dependents: z.array(z.string())
});

/**
 * stdout of `turbo run <tasks> --dry=json`. `hash` is null for a JIT-hashed task; phantom, umbrella and aggregate
 * tasks report `command: "<NONEXISTENT>"`. Unknown keys are stripped; every listed key is required.
 */
export const dryRunSchema = z.object({ tasks: z.array(taskSchema) });
