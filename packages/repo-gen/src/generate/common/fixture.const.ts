import type { FixtureSpec, PresetName } from './fixture.type.ts';

/** The first four tasks of every package, in this order; task 5 onward is `task-<n>`. */
export const BASE_TASKS = ['build', 'lint', 'test', 'typecheck'];

export const HUB_TAG = 'fx:hub';

/** Atomizer umbrella task; its file tasks are `e2e-ci--<path>`, carriers `e2e-ci-src--<path>`. */
export const ATOM_TASK = 'e2e-ci';

export const ATOM_AGGREGATE_TASK = `${ATOM_TASK}--all`;

export const ATOM_TASK_TAG = `atomizer:${ATOM_TASK}`;

export const CARRIER_TAG = 'atomizer:carrier';

export const DEFINITIONS_TAG = 'atomizer:definitions';

export const LIVE_TAG = 'atomizer:live';

export const FIXTURE_PACKAGE_MANAGER = 'pnpm@12.11.2';

/**
 * Folded into the fixture cache key next to the rendered files. Bump it whenever the git step changes (branch, commit
 * message, `git -c` flags, hooks handling), since those change the cached repo without changing any rendered file.
 */
export const FIXTURE_CACHE_VERSION = 1;

export const NOOP_SCRIPT = 'node -e 0';

export const NARROW_INPUTS = ['src/**'];

const targetLikeAtomGroups = { count: 1, filesPerGroup: 10, liveRatio: 0.1 };

const stretchAtomGroups = { count: 20, filesPerGroup: 200, liveRatio: 0.1 };

const noAtomGroups = { count: 0, filesPerGroup: 0, liveRatio: 0.1 };

/** Counts, depth and fan-in calibrated against the real target repo; ratios are fixed across presets. */
const TARGET_LIKE: FixtureSpec = {
  seed: 1,
  packages: 14,
  tasksPerPackage: 7,
  maxDepth: 3,
  hubFanIn: 4,
  phantomRatio: 0.1,
  narrowInputsTask: 'test',
  atomGroups: targetLikeAtomGroups,
  affectedUsingTaskInputs: true
};

const STRETCH_300: FixtureSpec = {
  seed: 1,
  packages: 300,
  tasksPerPackage: 5,
  maxDepth: 6,
  hubFanIn: 80,
  phantomRatio: 0.1,
  narrowInputsTask: 'test',
  atomGroups: stretchAtomGroups,
  affectedUsingTaskInputs: true
};

const STRESS: FixtureSpec = {
  seed: 1,
  packages: 1000,
  tasksPerPackage: 10,
  maxDepth: 10,
  hubFanIn: 300,
  phantomRatio: 0.1,
  narrowInputsTask: 'test',
  atomGroups: noAtomGroups,
  affectedUsingTaskInputs: true
};

export const PRESETS: Record<PresetName, FixtureSpec> = {
  'target-like': TARGET_LIKE,
  'stretch-300': STRETCH_300,
  stress: STRESS
};
