import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import type { DryRun } from '../../shared/turbo/common/turbo.type.ts';
import { assertTurboName } from '../../shared/turbo/utils/turbo-name.util.ts';
import type { DryRunRequest, DryRunState } from '../common/dry-run-state.type.ts';

type DryRunTask = DryRun['tasks'][number];

/** turbo's `command` for a task with no script: phantom, umbrella and aggregate tasks. */
const NONEXISTENT = '<NONEXISTENT>';

const compareIds = (left: DryRunState, right: DryRunState): number => compareText(left.id, right.id);

const hasCommand = (task: DryRunTask): boolean => task.command !== NONEXISTENT;

const toDryRunState = (task: DryRunTask): DryRunState => {
  const cache = task.hash === null ? 'deferred' : task.cache.status;
  const state: DryRunState = { id: task.taskId, hash: task.hash, cache };

  return state;
};

/**
 * `run <tasks…> [--filter=<pkg>…] --dry=json`. An empty `tasks` throws `invalid-argument`, as does any task or package
 * name `assertTurboName` rejects, so a bad request never reaches a spawn.
 */
export const dryRunArgs = (request: DryRunRequest): string[] => {
  const { tasks } = request;

  if (tasks.length === 0) throw new TurboException('invalid-argument', 'dry run needs at least one task');

  const packages = request.packages ?? [];
  const names = [...tasks, ...packages];

  for (const name of names) assertTurboName(name);

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
