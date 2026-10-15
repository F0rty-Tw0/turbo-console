import { z } from 'zod';

const cacheSchema = z.object({ status: z.enum(['HIT', 'MISS']) });

const resolvedTaskDefinitionSchema = z.object({
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  dependsOn: z.array(z.string()),
  cache: z.boolean(),
  persistent: z.boolean(),
  env: z.array(z.string())
});

const taskSchema = z.object({
  taskId: z.string(),
  package: z.string(),
  task: z.string(),
  hash: z.string().nullable(),
  command: z.string(),
  cache: cacheSchema,
  resolvedTaskDefinition: resolvedTaskDefinitionSchema
});

/**
 * stdout of `turbo run <tasks> --dry=json`. `hash` is null for a JIT-hashed task; phantom, umbrella and aggregate
 * tasks report `command: "<NONEXISTENT>"`. Unknown keys are stripped; every listed key is required. `dependencies` and
 * `dependents` are left out: nothing reads them, and checking them costs parse time on every dry run.
 */
export const dryRunSchema = z.object({ tasks: z.array(taskSchema) });
