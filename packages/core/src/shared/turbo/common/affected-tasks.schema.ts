import { array, object, string } from 'zod/mini';

// eslint-disable-next-line @typescript-eslint/naming-convention -- GraphQL's own `__typename` key, copied from turbo's output.
const reasonSchema = object({ __typename: string() });

const changedTaskSchema = object({ fullName: string(), reason: reasonSchema });

const changedTasksSchema = object({ items: array(changedTaskSchema) });

const dataSchema = object({ affectedTasks: changedTasksSchema });

/**
 * stdout of `turbo query` with `AFFECTED_TASKS_QUERY`. `reason.__typename` names the change kind, such as
 * `TaskFileChanged` or `TaskAllChanged`. Unknown keys are stripped; every listed key is required.
 */
export const affectedTasksSchema = object({ data: dataSchema });
