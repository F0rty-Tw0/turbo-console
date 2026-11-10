import { taskNodeNamed } from './run-wait.spec.util.ts';
import { WAIT_LIMIT_MS, sleep, waitFor } from './suite-env.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { PREDICTION_BATCH_MS } from '../../src/tree/common/prediction.const.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { DryRunClose, ShownManifest, ShownPackage, ShownTask } from '../common/launch.type.ts';
import { FILTER_PREFIX, PREDICTION_WORD_SET } from '../common/prediction.const.ts';
import type { PredictionPackages, PredictionScene } from '../common/prediction.type.ts';

const TASK_SEPARATOR = '#';

const POLL_MS = 100;

/** Far inside one batch window, but a real tick apart, so a window of 0 ms would send each shown package alone. */
const EXPAND_GAP_MS = 40;

/** The package name of a task id like `@fx/pkg-001#build`. */
export const packageOfTask = (taskId: string): string => taskId.slice(0, taskId.lastIndexOf(TASK_SEPARATOR));

const umbrellaNameOf = (task: ShownTask): string => task.fullName.slice(task.fullName.lastIndexOf(TASK_SEPARATOR) + 1);

const BUILD_SUFFIX = `${TASK_SEPARATOR}build`;

const byTaskName = (left: ShownTask, right: ShownTask): number =>
  Number(left.fullName > right.fullName) - Number(left.fullName < right.fullName);

/** A package with no Atomizer tag, so every dry run it joins is a prediction. */
export const isPlainPackage = (pkg: ShownPackage): boolean => {
  const isRegular = pkg.role === 'regular';
  const hasNoTag = pkg.tags.length === 0;

  return isRegular && hasNoTag;
};

const byName = (left: ShownPackage, right: ShownPackage): number => Number(left.name > right.name) - Number(left.name < right.name);

/** The id of the `build` task of package `name`. */
export const buildIdOf = (name: string): string => `${name}${BUILD_SUFFIX}`;

const hasBuild = (manifest: ShownManifest, pkg: ShownPackage): boolean => {
  const buildId = buildIdOf(pkg.name);
  const isBuildOf = (task: ShownTask): boolean => {
    const isBuild = task.fullName === buildId;

    return isBuild && task.visible;
  };

  return manifest.tasks.some(isBuildOf);
};

const idEntryOf = (task: ShownTask): [string, ShownTask] => [task.fullName, task];

/**
 * The first plain package, by name, whose `build` depends only on the `build` of another plain package, and that dependency,
 * whose `build` depends on nothing. Case P4 reads the tasks that ran as exactly these two, so a fixture that changes shape
 * fails here, naming the cause.
 */
const plainPairOf = (manifest: ShownManifest, plain: ShownPackage[]): [string, string] => {
  const names = new Set(plain.map((pkg) => pkg.name));
  const isPlainBuildId = (id: string): boolean => {
    const isBuild = id.endsWith(BUILD_SUFFIX);
    const isOfPlain = names.has(packageOfTask(id));

    return isBuild && isOfPlain;
  };
  const isShownBuild = (task: ShownTask): boolean => {
    const isShownTask = task.visible && task.kind === 'task';

    return isShownTask && isPlainBuildId(task.fullName);
  };
  const shownBuilds = manifest.tasks.filter(isShownBuild);
  const sortedBuilds = shownBuilds.toSorted(byTaskName);
  const buildsById = new Map(sortedBuilds.map(idEntryOf));

  for (const task of sortedBuilds) {
    const [dependency, ...others] = task.dependencies;

    if (dependency === undefined) continue;

    if (others.length > 0) continue;

    const dependencyTask = buildsById.get(dependency);
    const dependsOnNothing = dependencyTask?.dependencies.length === 0;

    if (dependsOnNothing) return [task.packageName, packageOfTask(dependency)];
  }

  throw new Error('no plain package has a build that depends only on the build of a plain package whose build depends on nothing');
};

/**
 * `a` and `b` are the first plain packages (regular, no Atomizer tag) where `a#build` depends on `b#build`; `c` is the
 * first other plain package with a `build` and no dependency.
 */
export const predictionPackagesOf = (manifest: ShownManifest): PredictionPackages => {
  const plain = manifest.packages.filter(isPlainPackage);
  const [a, b] = plainPairOf(manifest, plain);
  const pair = [a, b];
  const isFree = (pkg: ShownPackage): boolean => {
    const hasNoDependency = pkg.dependencies.length === 0;
    const isOutsidePair = !pair.includes(pkg.name);

    return hasNoDependency && isOutsidePair;
  };
  const hasOwnBuild = (pkg: ShownPackage): boolean => hasBuild(manifest, pkg);
  const free = plain.filter(isFree);
  const withBuild = free.filter(hasOwnBuild);
  const [c] = withBuild.toSorted(byName);

  if (c === undefined) throw new Error('the manifest has no plain package with a build and no dependency besides the pair');

  const packages: PredictionPackages = { a, b, c: c.name };

  return packages;
};

const RUN_ARG = 'run';

const taskNamesOf = (args: string[]): string[] => {
  const afterRun = args.slice(args.indexOf(RUN_ARG) + 1);

  return afterRun.filter((arg) => !arg.startsWith('--'));
};

const isUmbrella = (task: ShownTask): boolean => task.kind === 'umbrella';

/** Whether args are a prediction's: the Atomizer's own dry runs (the graph page posts `shownUmbrellas`, the tree loads umbrella children) carry the umbrella task names only. */
const predictionTestOf = (scene: PredictionScene): ((args: string[]) => boolean) => {
  const umbrellaTasks = scene.manifest.tasks.filter(isUmbrella);
  const umbrellas = new Set(umbrellaTasks.map(umbrellaNameOf));
  const isAtomRun = (args: string[]): boolean => {
    const names = taskNamesOf(args);
    const hasNames = names.length > 0;

    return hasNames && names.every((name) => umbrellas.has(name));
  };

  return (args) => !isAtomRun(args);
};

/** The dry runs since the last counter reset that are predictions. */
export const predictionRunsOf = (scene: PredictionScene): string[][] => scene.counter.dryRuns().filter(predictionTestOf(scene));

/** The closes of those dry runs, filtered the same way as `predictionRunsOf`. */
export const predictionClosesOf = (scene: PredictionScene): DryRunClose[] => {
  const isPrediction = predictionTestOf(scene);
  const isPredictionClose = (close: DryRunClose): boolean => isPrediction(close.args);

  return scene.counter.dryRunCloses().filter(isPredictionClose);
};

/** The package names a dry run's args filter on, in their order. */
export const filtersOf = (args: string[]): string[] => {
  const isFilter = (arg: string): boolean => arg.startsWith(FILTER_PREFIX);

  return args.filter(isFilter).map((arg) => arg.slice(FILTER_PREFIX.length));
};

/**
 * Asks for the children of every named package node one after another, `EXPAND_GAP_MS` apart, so their shows land in one
 * batch window. The root is quiet first, so a redraw on the host cannot slow the loop; the first-to-last span is checked
 * against the window, and a slower loop throws as a precondition failure, not as a wrong dry-run count later.
 */
export const expandTogether = async (scene: PredictionScene, names: string[]): Promise<void> => {
  const { api, root } = scene;
  const nodes: TreeNode[] = [];
  const startedAt: number[] = [];

  for (const name of names) nodes.push(await packageNodeNamed(api, name));

  await whenQuiet(api, root);

  for (const node of nodes) {
    startedAt.push(performance.now());
    await api.tree.getChildren(node);
    await sleep(EXPAND_GAP_MS);
  }

  const first = startedAt.at(0) ?? Number.NaN;
  const last = startedAt.at(-1) ?? Number.NaN;
  const spanMs = Math.round(last - first);

  if (spanMs > PREDICTION_BATCH_MS) {
    throw new Error(
      `precondition: expanding ${names.length} packages took ${spanMs} ms, over the ${PREDICTION_BATCH_MS} ms batch window, so they cannot share one dry run`
    );
  }
};

export const descriptionIfAny = (api: TurboConsoleApi, node: TreeNode): string => {
  const { description } = api.tree.getTreeItem(node);

  return typeof description === 'string' ? description : '';
};

/** Expands package `name` and waits until one of its task rows reads a prediction word. */
export const expandAndSettle = async (api: TurboConsoleApi, name: string): Promise<TreeNode[]> => {
  const node = await packageNodeNamed(api, name);
  const rows = await api.tree.getChildren(node);
  const hasWord = (): boolean => rows.some((row) => PREDICTION_WORD_SET.has(descriptionIfAny(api, row)));

  await waitFor(`${name} reads a prediction word`, hasWord);

  return rows;
};

/** The description of the row of `taskId`, read fresh from the tree; empty when the row has none. */
export const taskWordOf = async (api: TurboConsoleApi, taskId: string): Promise<string> => {
  const node = await taskNodeNamed(api, packageOfTask(taskId), taskId);

  return descriptionIfAny(api, node);
};

/** Polls the row of `taskId` until it reads `word`; throws with the last word read after `WAIT_LIMIT_MS`. */
export const waitForWord = async (api: TurboConsoleApi, taskId: string, word: string): Promise<void> => {
  const deadline = performance.now() + WAIT_LIMIT_MS;
  let read = await taskWordOf(api, taskId);

  while (read !== word) {
    const now = performance.now();
    const isLate = now > deadline;

    if (isLate) throw new Error(`${taskId} read "${read}", not "${word}", after ${WAIT_LIMIT_MS} ms`);

    await sleep(POLL_MS);
    read = await taskWordOf(api, taskId);
  }
};
