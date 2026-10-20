import { array, boolean, nullable, object, optional, string, enum as zodEnum } from 'zod/mini';

const cacheSchema = object({ status: zodEnum(['HIT', 'MISS']) });

const resolvedTaskDefinitionSchema = object({
  inputs: array(string()),
  outputs: array(string()),
  dependsOn: array(string()),
  cache: boolean(),
  persistent: boolean(),
  env: array(string())
});

const taskSchema = object({
  taskId: string(),
  package: optional(nullable(string())),
  task: string(),
  hash: nullable(string()),
  command: string(),
  cache: cacheSchema,
  resolvedTaskDefinition: resolvedTaskDefinitionSchema
});

/**
 * stdout of `turbo run <tasks> --dry=json`. `hash` is null for a JIT-hashed task; phantom, umbrella and aggregate
 * tasks report `command: "<NONEXISTENT>"`. `monorepo: false` output (single-package) has bare `taskId`s and a task
 * `package` that is `null` (with `--single-package`) or absent (turbo's own inference). Unknown keys are stripped; every listed key is required. `dependencies` and
 * `dependents` are left out: nothing reads them, and checking them costs parse time on every dry run.
 */
export const dryRunSchema = object({ monorepo: boolean(), tasks: array(taskSchema) });
