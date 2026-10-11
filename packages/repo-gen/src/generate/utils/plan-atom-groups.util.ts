import { ratioCount } from './plan-tasks.util.ts';
import { pickRandom } from './prng.util.ts';
import { ATOM_TASK, DEFINITIONS_TAG } from '../common/fixture.const.ts';
import type { AtomGroupPlan, FixtureSpec, ManifestPackage, PackagePlan, SpecFile } from '../common/fixture.type.ts';

const specFile = (position: number, liveIndexes: Set<number>): SpecFile => {
  const id = String(position + 1).padStart(3, '0');
  const live = liveIndexes.has(position);
  const suffix = live ? '.live.spec.ts' : '.spec.ts';
  const file: SpecFile = { path: `tests/spec-${id}${suffix}`, live };

  return file;
};

/** Atomizer file task name for a spec path: `e2e-ci--<path>`. */
export const fileTaskName = (path: string): string => `${ATOM_TASK}--${path}`;

/** Atomizer carrier task name for a spec path: `e2e-ci-src--<path>`. */
export const carrierTaskName = (path: string): string => `${ATOM_TASK}-src--${path}`;

/** The test package, with the group's dependencies, and the dependency-free definitions package of a group. */
export const atomPackages = (group: AtomGroupPlan): [ManifestPackage, ManifestPackage] => {
  const test: ManifestPackage = {
    name: group.testPackage,
    path: `apps/e2e-${group.index}`,
    role: 'atom-test',
    tags: [],
    dependencies: group.dependencies
  };
  const definitions: ManifestPackage = {
    name: group.definitionsPackage,
    path: `tools/e2e-${group.index}-atoms`,
    role: 'atom-definitions',
    tags: [DEFINITIONS_TAG],
    dependencies: []
  };

  return [test, definitions];
};

/**
 * One plan per atom group, `index` from 1. Each group has `filesPerGroup` spec files `tests/spec-<nnn>.spec.ts`;
 * `ceil(liveRatio × filesPerGroup)` random ones are live and named `tests/spec-<nnn>.live.spec.ts` instead.
 * The test package depends on one random level-0 regular package, its app: depending on level 0 leaves the hub's
 * fan-in and the dependent-free top level untouched.
 */
export const planAtomGroups = (spec: FixtureSpec, packages: PackagePlan[], random: () => number): AtomGroupPlan[] => {
  const { count, filesPerGroup, liveRatio } = spec.atomGroups;
  const positions = Array.from({ length: filesPerGroup }, (_, position) => position);
  const liveCount = ratioCount(liveRatio, filesPerGroup);
  const apps = packages.filter((pkg) => pkg.role === 'regular' && pkg.level === 0);

  const group = (_: unknown, offset: number): AtomGroupPlan => {
    const index = offset + 1;
    const dependencies = pickRandom(apps, 1, random).map((app) => app.name);
    const liveIndexes = new Set(pickRandom(positions, liveCount, random));
    const specFiles = positions.map((position) => specFile(position, liveIndexes));
    const plan: AtomGroupPlan = {
      index,
      testPackage: `@fx/e2e-${index}`,
      definitionsPackage: `@fx/e2e-${index}-atoms`,
      dependencies,
      specFiles
    };

    return plan;
  };

  return Array.from({ length: count }, group);
};
