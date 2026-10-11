import { toJsonFile } from './json-file.util.ts';
import { taskNamesFor } from './plan-tasks.util.ts';
import { NARROW_INPUTS, NULL_HASH_INPUTS } from '../common/fixture.const.ts';
import type { FixtureFile, FixturePlan, FixtureSpec, TaskInput } from '../common/fixture.type.ts';

type TurboTask = {
  readonly dependsOn: string[] | undefined;
  readonly inputs: TaskInput[] | undefined;
};

type FutureFlags = {
  readonly experimentalTaskCommand: true | undefined;
  readonly affectedUsingTaskInputs: boolean;
};

type RootTurboJson = {
  readonly $schema: string;
  readonly agentGuidance: false;
  readonly tasks: Record<string, TurboTask>;
  readonly futureFlags: FutureFlags;
};

/** Root `dependsOn` of a root task; `undefined` when it has none. */
export const dependsOnFor = (task: string): string[] | undefined => {
  switch (task) {
    case 'lint':
      return undefined;
    case 'build':
    case 'test':
    case 'typecheck':
      return ['^build'];
    default:
      return [`^${task}`, 'build'];
  }
};

const inputsFor = (spec: FixtureSpec, task: string): TaskInput[] | undefined => {
  if (task === spec.nullHashTask) return NULL_HASH_INPUTS;

  if (task === spec.narrowInputsTask) return NARROW_INPUTS;

  return undefined;
};

/**
 * Root `turbo.json`. `undefined` keys are dropped by `JSON.stringify`, so `lint` renders as `{}` and
 * `experimentalTaskCommand` appears only when atom groups exist. `agentGuidance: false` stops turbo writing `AGENTS.md`.
 */
export const renderTurboJson = (plan: FixturePlan): FixtureFile => {
  const { spec } = plan;

  const taskEntry = (task: string): [string, TurboTask] => {
    const dependsOn = dependsOnFor(task);
    const inputs = inputsFor(spec, task);
    const config: TurboTask = { dependsOn, inputs };

    return [task, config];
  };

  const taskEntries = taskNamesFor(spec.tasksPerPackage).map(taskEntry);
  const tasks = Object.fromEntries(taskEntries);
  const hasAtomGroups = spec.atomGroups.count > 0;
  const experimentalTaskCommand = hasAtomGroups ? true : undefined;
  const futureFlags: FutureFlags = { experimentalTaskCommand, affectedUsingTaskInputs: spec.affectedUsingTaskInputs };
  const turbo: RootTurboJson = { $schema: 'https://turborepo.com/schema.json', agentGuidance: false, tasks, futureFlags };

  return toJsonFile('turbo.json', turbo);
};
