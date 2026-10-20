import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { turboCommand } from '../../shared/errors/utils/turbo-message.util.ts';
import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import { SINGLE_PACKAGE } from '../../shared/turbo/common/turbo-args.const.ts';
import type { DryRun } from '../../shared/turbo/common/turbo.type.ts';
import { assertFilterName, assertTaskName } from '../../shared/turbo/utils/turbo-name.util.ts';
import { ROOT_NAME } from '../../workspace/utils/turbo-task-lookup.util.ts';
import type { DryRunRequest, DryRunState, TaskDefinition } from '../common/dry-run-state.type.ts';

type DryRunTask = DryRun['tasks'][number];

/** turbo's `command` for a task with no script: phantom, umbrella and aggregate tasks. */
const NONEXISTENT = '<NONEXISTENT>';

const compareIds = (left: DryRunState, right: DryRunState): number => compareText(left.id, right.id);

const hasCommand = (task: DryRunTask): boolean => task.command !== NONEXISTENT;

const toTaskDefinition = (task: DryRunTask): TaskDefinition => {
  const { inputs, outputs, dependsOn, cache, persistent, env } = task.resolvedTaskDefinition;
  const definition: TaskDefinition = { inputs, outputs, dependsOn, cache, persistent, env };

  return definition;
};

/** A single-package task id is bare (`build`); the root package is `//`. */
const idOf = (task: DryRunTask, monorepo: boolean): string => (monorepo ? task.taskId : `${ROOT_NAME}#${task.taskId}`);

const toDryRunState = (task: DryRunTask, monorepo: boolean): DryRunState => {
  const cache = task.hash === null ? 'deferred' : task.cache.status;
  const definition = toTaskDefinition(task);
  const id = idOf(task, monorepo);
  const state: DryRunState = { id, hash: task.hash, cache, definition };

  return state;
};

/**
 * `run <tasks…> [--filter=<pkg>…] [--single-package] --dry=json`. An empty `tasks` throws `invalid-argument`, as does a task name
 * `assertTaskName` rejects (a `pkg#task` id) or a package name `assertFilterName` rejects (filter syntax), so a bad
 * request never reaches a spawn.
 */
export const dryRunArgs = (request: DryRunRequest): string[] => {
  const { tasks } = request;

  if (tasks.length === 0) throw new TurboException('invalid-argument', 'dry run needs at least one task');

  const packages = request.packages ?? [];

  for (const task of tasks) assertTaskName(task);

  for (const name of packages) assertFilterName(name);

  const filters = packages.map((name) => `--filter=${name}`);
  const singleArgs = [SINGLE_PACKAGE];
  const noArgs: string[] = [];
  const modeArgs = request.singlePackage === true ? singleArgs : noArgs;
  const args = ['run', ...tasks, ...filters, ...modeArgs, '--dry=json'];

  return args;
};

const hasNoPackage = (task: DryRunTask): boolean => task.package === undefined || task.package === null;

const assertPackaged = (json: DryRun): void => {
  const hasPackagelessTask = json.tasks.some(hasNoPackage);

  if (!json.monorepo || !hasPackagelessTask) return;

  throw new TurboException('invalid-output', `${turboCommand('run --dry=json')} output has a task with no package`);
};

/**
 * turbo's dry-run tasks with a command, sorted by id; a `null` hash reads as `'deferred'`. A `monorepo: false` run
 * gets `//#` ids; a monorepo run with a package-less task throws `invalid-output`.
 */
export const toDryRunStates = (json: DryRun): DryRunState[] => {
  assertPackaged(json);

  const runnable = json.tasks.filter(hasCommand);
  const states = runnable.map((task) => toDryRunState(task, json.monorepo));

  return states.toSorted(compareIds);
};
