import type { RunAllDefinition, RunAllLaunch, RunAllTaskDefinition } from '../common/run-all.type.ts';
import { RUN_ALL_PREFIX, RUN_TASK_TYPE } from '../common/run.const.ts';

/** `<root>\0<id>\0<affected>`: what the guard keeps for a run all in flight. */
export const runAllKeyOf = (definition: RunAllDefinition): string => `${definition.root}\0${definition.id}\0${definition.affected}`;

/** The guard key of running `taskName` in `root`: the key of its task definition. */
export const runAllKey = (root: string, taskName: string, affected: boolean): string => {
  const definition: RunAllDefinition = { root, id: `${RUN_ALL_PREFIX}${taskName}`, affected };

  return runAllKeyOf(definition);
};

export const runAllTaskDefinitionOf = (launch: RunAllLaunch): RunAllTaskDefinition => {
  const definition: RunAllTaskDefinition = {
    type: RUN_TASK_TYPE,
    root: launch.root,
    id: `${RUN_ALL_PREFIX}${launch.taskName}`,
    affected: launch.affected
  };

  return definition;
};

/**
 * The run all a task event belongs to, from its task definition; `null` for a task of another type, for the id of a
 * single task run (it never starts with the prefix), and for one with no `affected` flag.
 */
export const runAllDefinitionOf = (definition: Readonly<Record<string, unknown>>): RunAllDefinition | null => {
  const { type, root, id, affected } = definition;

  if (type !== RUN_TASK_TYPE) return null;

  const isNamed = typeof root === 'string' && typeof id === 'string';

  if (!isNamed) return null;

  const isRunAll = id.startsWith(RUN_ALL_PREFIX);

  if (!isRunAll) return null;

  if (typeof affected !== 'boolean') return null;

  const named: RunAllDefinition = { root, id, affected };

  return named;
};
