import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import type { DryRun } from '../../shared/turbo/common/turbo.type.ts';
import { assertFilterName, assertTaskName } from '../../shared/turbo/utils/turbo-name.util.ts';
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

const toDryRunState = (task: DryRunTask): DryRunState => {
  const cache = task.hash === null ? 'deferred' : task.cache.status;
  const definition = toTaskDefinition(task);
  const state: DryRunState = { id: task.taskId, hash: task.hash, cache, definition };

  return state;
};

/**
 * `run <tasks…> [--filter=<pkg>…] --dry=json`. An empty `tasks` throws `invalid-argument`, as does a task name
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
  const args = ['run', ...tasks, ...filters, '--dry=json'];

  return args;
};

/** turbo's dry-run tasks with a command, sorted by id; a `null` hash reads as `'deferred'`. */
export const toDryRunStates = (json: DryRun): DryRunState[] => {
  const runnable = json.tasks.filter(hasCommand);
  const states = runnable.map(toDryRunState);

  return states.toSorted(compareIds);
};
