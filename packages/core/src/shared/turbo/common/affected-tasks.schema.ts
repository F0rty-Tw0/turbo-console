import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/naming-convention -- GraphQL's own `__typename` key, copied from turbo's output.
const reasonSchema = z.object({ __typename: z.string() });

const changedTaskSchema = z.object({ fullName: z.string(), reason: reasonSchema });

const changedTasksSchema = z.object({ items: z.array(changedTaskSchema) });

const dataSchema = z.object({ affectedTasks: changedTasksSchema });

/**
 * stdout of `turbo query` with `AFFECTED_TASKS_QUERY`. `reason.__typename` names the change kind, such as
 * `TaskFileChanged` or `TaskAllChanged`. Unknown keys are stripped; every listed key is required.
 */
export const affectedTasksSchema = z.object({ data: dataSchema });
