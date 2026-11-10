import { taskNodeNamed } from './run-wait.spec.util.ts';
import { sleep, waitFor } from './suite-env.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode, TreeRefresh } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest, ShownPackage, ShownTask } from '../common/launch.type.ts';
import { FILTER_PREFIX, PREDICTION_WORD_SET, SETTLE_LIMIT_MS } from '../common/prediction.const.ts';
import type { PredictionPackages, PredictionScene, SettleWatch } from '../common/prediction.type.ts';

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

const isPlain = (pkg: ShownPackage): boolean => pkg.role === 'regular' && pkg.tags.length === 0;

const byName = (left: ShownPackage, right: ShownPackage): number => Number(left.name > right.name) - Number(left.name < right.name);

const hasBuild = (manifest: ShownManifest, pkg: ShownPackage): boolean => {
  const buildId = `${pkg.name}${BUILD_SUFFIX}`;
  const isBuildOf = (task: ShownTask): boolean => task.fullName === buildId && task.visible;

  return manifest.tasks.some(isBuildOf);
};

/** The first plain package, by name, whose `build` depends on the `build` of another plain package, and that dependency. */
const plainPairOf = (manifest: ShownManifest, plain: ShownPackage[]): [string, string] => {
  const names = new Set(plain.map((pkg) => pkg.name));
  const isPlainBuildId = (id: string): boolean => {
    const isBuild = id.endsWith(BUILD_SUFFIX);
    const isPlainPackage = names.has(packageOfTask(id));

    return isBuild && isPlainPackage;
  };
  const isShownBuild = (task: ShownTask): boolean => task.visible && task.kind === 'task' && isPlainBuildId(task.fullName);

  for (const task of manifest.tasks.filter(isShownBuild).toSorted(byTaskName)) {
    const dependency = task.dependencies.find(isPlainBuildId);

    if (dependency !== undefined) return [task.packageName, packageOfTask(dependency)];
  }

  throw new Error('no plain package has a build that depends on the build of another plain package');
};

/**
 * `a` and `b` are the first plain packages (regular, no Atomizer tag) where `a#build` depends on `b#build`; `c` is the
 * first other plain package with a `build` and no dependency.
 */
export const predictionPackagesOf = (manifest: ShownManifest): PredictionPackages => {
  const plain = manifest.packages.filter(isPlain);
  const [a, b] = plainPairOf(manifest, plain);
  const pair = [a, b];
  const isFree = (pkg: ShownPackage): boolean => pkg.dependencies.length === 0 && !pair.includes(pkg.name);
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

/**
 * The dry runs since the last counter reset that are predictions: the Atomizer's own dry runs (the graph page posts
 * `shownUmbrellas`, the tree loads umbrella children) carry the umbrella task names only, so they are left out.
 */
export const predictionRunsOf = (scene: PredictionScene): string[][] => {
  const umbrellas = new Set(scene.manifest.tasks.filter((task) => task.kind === 'umbrella').map(umbrellaNameOf));
  const isAtomRun = (args: string[]): boolean => {
    const names = taskNamesOf(args);

    return names.length > 0 && names.every((name) => umbrellas.has(name));
  };

  return scene.counter.dryRuns().filter((args) => !isAtomRun(args));
};

/** The package names a dry run's args filter on, in their order. */
export const filtersOf = (args: string[]): string[] => {
  const isFilter = (arg: string): boolean => arg.startsWith(FILTER_PREFIX);

  return args.filter(isFilter).map((arg) => arg.slice(FILTER_PREFIX.length));
};

/** Asks for the children of every named package node one after another, `EXPAND_GAP_MS` apart, so their shows land in one batch window. */
export const expandTogether = async (api: TurboConsoleApi, names: string[]): Promise<void> => {
  const nodes: TreeNode[] = [];

  for (const name of names) nodes.push(await packageNodeNamed(api, name));

  for (const node of nodes) {
    await api.tree.getChildren(node);
    await sleep(EXPAND_GAP_MS);
  }
};

const descriptionIfAny = (api: TurboConsoleApi, node: TreeNode): string => {
  const { description } = api.tree.getTreeItem(node);

  return typeof description === 'string' ? description : '';
};

/** Expands package `name` and waits until one of its task rows reads a prediction word. */
export const expandAndSettle = async (api: TurboConsoleApi, name: string): Promise<TreeNode[]> => {
  const node = await packageNodeNamed(api, name);
  const rows = await api.tree.getChildren(node);
  const hasWord = (): boolean => rows.some((row) => PREDICTION_WORD_SET.has(descriptionIfAny(api, row)));

  await waitFor(`${name} reads a prediction word`, hasWord, SETTLE_LIMIT_MS);

  return rows;
};

/** The description of the row of `taskId`, read fresh from the tree; empty when the row has none. */
export const taskWordOf = async (api: TurboConsoleApi, taskId: string): Promise<string> => {
  const node = await taskNodeNamed(api, packageOfTask(taskId), taskId);

  return descriptionIfAny(api, node);
};

/** Polls the row of `taskId` until it reads `word`; throws with the last word read after `SETTLE_LIMIT_MS`. */
export const waitForWord = async (api: TurboConsoleApi, taskId: string, word: string): Promise<void> => {
  const deadline = performance.now() + SETTLE_LIMIT_MS;
  let read = await taskWordOf(api, taskId);

  while (read !== word) {
    const now = performance.now();
    const isLate = now > deadline;

    if (isLate) throw new Error(`${taskId} read "${read}", not "${word}", after ${SETTLE_LIMIT_MS} ms`);

    await sleep(POLL_MS);
    read = await taskWordOf(api, taskId);
  }
};

const nodesOf = (refresh: TreeNode | TreeNode[]): TreeNode[] => {
  if (Array.isArray(refresh)) return refresh;

  return [refresh];
};

const isPackageRedraw = (refresh: TreeRefresh): boolean => {
  if (refresh === undefined) return false;

  const nodes = nodesOf(refresh);
  const isPackage = (node: TreeNode): boolean => node.kind === 'pkg';

  return nodes.some(isPackage);
};

/** Counts and times the tree events that redraw package nodes: the store fires one when a dry run settles or fails. */
export const watchSettles = (api: TurboConsoleApi): SettleWatch => {
  const times: number[] = [];
  const listening = api.tree.onDidChangeTreeData((refresh) => {
    const isRedraw = isPackageRedraw(refresh);

    if (isRedraw) times.push(performance.now());
  });
  const watch: SettleWatch = {
    count: () => times.length,
    times: () => [...times],
    dispose: () => {
      listening.dispose();
    }
  };

  return watch;
};
