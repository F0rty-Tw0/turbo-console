import { PRESETS } from '@turbo-console/repo-gen';
import type { TaskKind } from '@turbo-console/repo-gen';

import { README_FILE } from '../common/affected.const.ts';
import type { AffectedEdit, AffectedMarkKind, OracleMode } from '../common/affected.type.ts';
import type { ShownManifest, ShownTask } from '../common/launch.type.ts';

type Roles = {
  readonly seeds: Set<string>;
  readonly dependents: Set<string>;
  readonly required: Set<string>;
};

/** The task whose inputs are `src/**`, so a README edit does not touch it in task mode. */
const NARROW_TASK = PRESETS['target-like'].narrowInputsTask;

/** The kinds the tree draws as task rows. */
const KEPT_KINDS: ReadonlySet<TaskKind> = new Set<TaskKind>(['task', 'umbrella']);

const DEPENDENCY_ONLY_KINDS: ReadonlySet<TaskKind> = new Set<TaskKind>(['umbrella', 'aggregate']);

const taskNameOf = (task: ShownTask): string => task.fullName.slice(task.packageName.length + 1);

const isKept = (task: ShownTask): boolean => task.visible && KEPT_KINDS.has(task.kind);

const isTouchedBy = (edit: AffectedEdit, task: ShownTask, mode: OracleMode): boolean => {
  if (edit.packageName !== task.packageName) return false;

  const isNarrowTask = taskNameOf(task) === NARROW_TASK;
  const isReadmeOnly = edit.file === README_FILE && isNarrowTask;

  return mode === 'package' || !isReadmeOnly;
};

/** Every id reachable from `starts` along `next`, the starts themselves only when another start reaches them. */
const reach = (starts: Iterable<string>, next: Map<string, string[]>): Set<string> => {
  const reached = new Set<string>();
  const queue = Array.from(starts);

  for (const id of queue) {
    for (const neighbour of next.get(id) ?? []) {
      const isSeen = reached.has(neighbour);

      if (isSeen) continue;

      reached.add(neighbour);
      queue.push(neighbour);
    }
  }

  return reached;
};

const dependentsIndexOf = (tasks: ShownTask[]): Map<string, string[]> => {
  const index = new Map<string, string[]>();

  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      const known = index.get(dependency) ?? [];

      index.set(dependency, [...known, task.fullName]);
    }
  }

  return index;
};

/** A seed that depends on a seed of another edited package cannot be told from a seed of its own: the edit set is ambiguous. */
const assertUnambiguous = (seeds: ShownTask[], forward: Map<string, string[]>): void => {
  const packageOfSeed = new Map(seeds.map((seed) => [seed.fullName, seed.packageName]));

  for (const seed of seeds) {
    const reached = reach([seed.fullName], forward);
    const reachedIds = Array.from(reached);
    const isForeign = (id: string): boolean => {
      const owner = packageOfSeed.get(id);

      return owner !== undefined && owner !== seed.packageName;
    };
    const foreign = reachedIds.filter(isForeign);

    if (foreign.length > 0) throw new Error(`ambiguous edit set: ${seed.fullName} depends on ${foreign.join(', ')}`);
  }
};

/** Precedence seed, then dependent, then required-only (`changed` only beside a kept seed of its package); `null` for a task turbo does not name. */
const markOf = (task: ShownTask, roles: Roles, seedPackages: Set<string>): AffectedMarkKind | null => {
  const id = task.fullName;
  const isDependencyOnly = DEPENDENCY_ONLY_KINDS.has(task.kind);
  const isSeed = roles.seeds.has(id);
  const isDependent = roles.dependents.has(id);
  const isRequired = roles.required.has(id);
  const hasSeedBeside = seedPackages.has(task.packageName);
  const isChangedBeside = hasSeedBeside && !isDependencyOnly;

  if (isSeed) return isDependencyOnly ? 'dependency' : 'changed';

  if (isDependent) return 'dependency';

  if (!isRequired) return null;

  return isChangedBeside ? 'changed' : 'dependency';
};

/**
 * What turbo should report for `edits`, modelled from the manifest alone. Seeds are the tasks of an edited package (mode
 * `task`: all but the narrow-inputs task for a README edit); dependents are the reverse transitive closure of the seeds
 * over `ShownTask.dependencies`; required tasks are the forward closure of both. Only visible tasks of `kinds` are kept,
 * by default the `task` and `umbrella` rows. Throws `ambiguous edit set` when a seed of one edited package depends on a
 * seed of another.
 */
export const expectedAffected = (
  manifest: ShownManifest,
  edits: AffectedEdit[],
  mode: OracleMode,
  kinds: ReadonlySet<TaskKind> = KEPT_KINDS
): Map<string, AffectedMarkKind> => {
  const isSeed = (task: ShownTask): boolean => edits.some((edit) => isTouchedBy(edit, task, mode));
  const seeds = manifest.tasks.filter(isSeed);
  const forward = new Map(manifest.tasks.map((task) => [task.fullName, task.dependencies]));
  const reverse = dependentsIndexOf(manifest.tasks);
  const seedIds = new Set(seeds.map((seed) => seed.fullName));

  assertUnambiguous(seeds, forward);

  const dependents = reach(seedIds, reverse);
  const dependentIds = Array.from(dependents);
  const seedAndDependentIds = [...seedIds, ...dependentIds];
  const required = reach(seedAndDependentIds, forward);
  const keptSeeds = seeds.filter(isKept);
  const seedPackages = new Set(keptSeeds.map((seed) => seed.packageName));
  const roles: Roles = { seeds: seedIds, dependents, required };
  const marks = new Map<string, AffectedMarkKind>();
  const isListed = (task: ShownTask): boolean => task.visible && kinds.has(task.kind);

  for (const task of manifest.tasks.filter(isListed)) {
    const mark = markOf(task, roles, seedPackages);

    if (mark !== null) marks.set(task.fullName, mark);
  }

  return marks;
};
