import { array, nullable, object, optional, string } from 'zod/mini';

const detailSchema = optional(nullable(string()));

const reasonSchema = object({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- GraphQL's own `__typename` key, copied from turbo's output.
  __typename: string(),
  filePath: detailSchema,
  taskName: detailSchema,
  packageName: detailSchema,
  description: detailSchema
});

const changedTaskSchema = object({ fullName: string(), reason: reasonSchema });

const changedTasksSchema = object({ items: array(changedTaskSchema) });

const dataSchema = object({ affectedTasks: changedTasksSchema });

/**
 * stdout of `turbo query` with `AFFECTED_TASKS_QUERY`. `reason.__typename` names the change kind, such as
 * `TaskFileChanged` or `TaskAllChanged`. The reason detail keys (`filePath`, `taskName`, `packageName`, `description`)
 * are optional: each change kind carries only its own. Unknown keys are stripped; every other listed key is required.
 */
export const affectedTasksSchema = object({ data: dataSchema });
