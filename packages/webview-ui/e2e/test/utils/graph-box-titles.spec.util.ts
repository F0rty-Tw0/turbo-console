import { indexesOf, largeState } from './graph-large.spec.util.ts';
import { packageOf } from './graph-package.spec.util.ts';
import { stretchTasksState } from './graph-stretch.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

const REPO_GEN_HASH = '9e9e9e01';

const SCOPE = '@fx';

/** A repo-gen package: its folder and bare name, `packages/pkg-001`. */
type RepoGenDir = {
  readonly folder: string;
  readonly bareName: string;
};

/** Build packages below this index need none, from it to `TWO_DEPENDENCIES_FROM` one, from that on two. */
const ONE_DEPENDENCY_FROM = 65;

const TWO_DEPENDENCIES_FROM = 200;

const dirsOf = (folder: string, prefix: string, count: number, width: number): RepoGenDir[] => {
  const dirOf = (index: number): RepoGenDir => {
    const dir: RepoGenDir = { folder, bareName: `${prefix}${String(index + 1).padStart(width, '0')}` };

    return dir;
  };

  return indexesOf(count).map(dirOf);
};

const HUB: RepoGenDir = { folder: 'packages', bareName: 'hub' };

const LIBRARIES = dirsOf('packages', 'pkg-', 259, 3);

const APPS = dirsOf('apps', 'e2e-', 20, 1);

const TOOLS = dirsOf('tools', 'atoms-', 20, 2);

/** The 280 packages with a `build`, in the order their dependencies are picked: `hub`, `pkg-001` to `pkg-259`, `e2e-1` to `e2e-20`. */
const BUILT: RepoGenDir[] = [HUB, ...LIBRARIES, ...APPS];

const nameOf = (dir: RepoGenDir): string => `${SCOPE}/${dir.bareName}`;

const repoGenPackageOf = (dir: RepoGenDir, taskCount: number): GraphPackage => {
  const pkg = packageOf(nameOf(dir), `${dir.folder}/${dir.bareName}`, [], taskCount);
  const scoped: GraphPackage = { ...pkg, bareName: dir.bareName };

  return scoped;
};

/** The build packages build package `index` needs: none below 65, one below 200, else two; the `j`-th is `floor(index * (j + 1) / 3)`. */
const dependencyCountOf = (index: number): number => {
  if (index < ONE_DEPENDENCY_FROM) return 0;

  if (index < TWO_DEPENDENCIES_FROM) return 1;

  return 2;
};

const dependencyNamesOf = (index: number): string[] => {
  const count = dependencyCountOf(index);
  const dependencyOf = (position: number): string => nameOf(BUILT[Math.floor((index * (position + 1)) / 3)] ?? HUB);

  return indexesOf(count).map(dependencyOf);
};

const buildOf = (dir: RepoGenDir, index: number): GraphTask => {
  const packageName = nameOf(dir);
  const dependencies = dependencyNamesOf(index).map((name): string => `${name}#build`);
  const task: GraphTask = {
    id: `${packageName}#build`,
    packageName,
    name: 'build',
    command: 'build',
    isRunnable: true,
    isTurboTask: true,
    dependencies
  };

  return task;
};

const edgesOf = (dir: RepoGenDir, index: number): GraphEdge[] => {
  const source = nameOf(dir);
  const edgeTo = (target: string): GraphEdge => {
    const edge: GraphEdge = { source, target };

    return edge;
  };

  return dependencyNamesOf(index).map(edgeTo);
};

/**
 * The shape of the U9-T1 repo-gen fixture, hash `9e9e9e01`: `@fx` packages `apps/e2e-1..20`, `packages/hub`,
 * `packages/pkg-001..259` and `tools/atoms-01..20`; the 280 outside `tools` each have one turbo `build`, which needs
 * the `build` of each package its package needs.
 */
export const repoGenLikeTasksState = (): GraphReady => {
  const builtDirs = [...APPS, HUB, ...LIBRARIES];
  const built = builtDirs.map((dir): GraphPackage => repoGenPackageOf(dir, 1));
  const tools = TOOLS.map((dir): GraphPackage => repoGenPackageOf(dir, 0));
  const packages = [...built, ...tools];
  const tasks = BUILT.map(buildOf);
  const edges = BUILT.flatMap(edgesOf);
  const base = largeState();
  const state: GraphReady = { ...base, hash: REPO_GEN_HASH, packages, edges, positions: null, tasks };

  return state;
};

const isBuild = (task: GraphTask): boolean => task.name === 'build';

/** `stretchTasksState` with only its 300 `build` tasks and no Atomizer groups. */
export const buildOnlyStretchState = (): GraphReady => {
  const stretch = stretchTasksState();
  const state: GraphReady = { ...stretch, tasks: stretch.tasks.filter(isBuild), atomGroups: [] };

  return state;
};
