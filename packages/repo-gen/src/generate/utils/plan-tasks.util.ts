import { pickRandom } from './prng.util.ts';
import { BASE_TASKS } from '../common/fixture.const.ts';
import type { FixtureSpec, PackagePlan } from '../common/fixture.type.ts';

const isPhantomEligible = (task: string): boolean => task !== 'build' && task !== 'test';

const isPlannedRole = (pkg: PackagePlan): boolean => pkg.role === 'regular' || pkg.role === 'hub';

const taskId = (packageName: string, task: string): string => `${packageName}#${task}`;

const eligibleTaskIds = (pkg: PackagePlan, tasks: string[]): string[] => {
  const eligible = tasks.filter(isPhantomEligible);

  return eligible.map((task) => taskId(pkg.name, task));
};

/** `ceil(ratio × total)` after rounding to 6 decimals, so float noise (0.1 × 30 = 3.0000000000000004) never adds one. */
export const ratioCount = (ratio: number, total: number): number => {
  const exact = Math.round(ratio * total * 1e6) / 1e6;

  return Math.ceil(exact);
};

/** The first `count` task names: the base tasks, then `task-5`, `task-6`, … */
export const taskNamesFor = (count: number): string[] => {
  const base = BASE_TASKS.slice(0, count);
  const extraCount = Math.max(count - BASE_TASKS.length, 0);
  const extra = Array.from({ length: extraCount }, (_, index) => `task-${BASE_TASKS.length + index + 1}`);

  return [...base, ...extra];
};

/**
 * Gives every regular package and the hub the spec's task list, then picks `ceil(phantomRatio × eligible pairs)`
 * repo-wide (package, task) pairs as phantoms; `build` and `test` are never eligible. Other roles pass through unchanged.
 */
export const planTasks = (spec: FixtureSpec, packages: PackagePlan[], random: () => number): PackagePlan[] => {
  const tasks = taskNamesFor(spec.tasksPerPackage);
  const pairs = packages.filter(isPlannedRole).flatMap((pkg) => eligibleTaskIds(pkg, tasks));
  const count = ratioCount(spec.phantomRatio, pairs.length);
  const phantomIds = new Set(pickRandom(pairs, count, random));

  const withTasks = (pkg: PackagePlan): PackagePlan => {
    const isPlanned = isPlannedRole(pkg);

    if (!isPlanned) return pkg;

    const phantoms = tasks.filter((task) => phantomIds.has(taskId(pkg.name, task)));
    const planned: PackagePlan = { ...pkg, tasks: [...tasks], phantoms };

    return planned;
  };

  return packages.map(withTasks);
};
