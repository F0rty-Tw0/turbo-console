import { RUN_TASK_TYPE } from '../common/run.const.ts';
import type { RunDefinition, RunEvent, RunRequest, RunTaskDefinition } from '../common/run.type.ts';

export const taskDefinitionOf = (request: RunRequest, launchedAt: number): RunTaskDefinition => {
  const definition: RunTaskDefinition = { type: RUN_TASK_TYPE, root: request.root, id: request.task.id, launchedAt };

  return definition;
};

/** Whether `definition` is a task of `run`, with or without a launch token. */
export const isTaskOf = (definition: Readonly<Record<string, unknown>>, run: RunDefinition): boolean => {
  const { type, root, id } = definition;
  const isRunTask = type === RUN_TASK_TYPE;

  return isRunTask && root === run.root && id === run.id;
};

/**
 * The run a task event belongs to, from its task definition; `null` for a task of another type, and for one with no
 * launch token: a task VS Code rebuilt itself (Rerun Last Task, a reconnect) is not a run this window launched.
 */
export const runEventOf = (definition: Readonly<Record<string, unknown>>): RunEvent | null => {
  const { type, root, id, launchedAt } = definition;

  if (type !== RUN_TASK_TYPE) return null;

  const isNamed = typeof root === 'string' && typeof id === 'string';

  if (!isNamed) return null;

  if (typeof launchedAt !== 'number') return null;

  const run: RunDefinition = { root, id };
  const event: RunEvent = { definition: run, launchedAt };

  return event;
};
