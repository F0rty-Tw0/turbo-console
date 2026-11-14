import { packageOf } from './graph-package.spec.util.ts';
import { taskOf } from './graph-task-of.spec.util.ts';
import type { GraphPackage, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

const APP_RECORD = packageOf('@org/app', 'packages/app', [], 1);

const APP: GraphPackage = { ...APP_RECORD, bareName: 'app' };

/** Long names make each task node wider than twice its box title, so the title stays left of the box centre. */
export const ROOT_TASK_NAME = 'generate-schemas-and-types-for-every-package';

export const APP_TASK_NAME = 'build-production-bundles-and-source-maps';

/** The root task and the `@org/app` task, standing alone. */
const TASKS: GraphTask[] = [taskOf('//', ROOT_TASK_NAME), taskOf('@org/app', APP_TASK_NAME)];

/**
 * `@org/app` (bare name `app`) with the tasks `//#generate-schemas-and-types-for-every-package` and
 * `@org/app#build-production-bundles-and-source-maps`, hash `7a5c0063`. As the real host does, it lists the root `//`
 * through its task only, never in `packages`. Only `scopeShown` differs between the two states.
 */
export const taskRootState = (scopeShown: boolean): GraphReady => {
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown,
    scriptsShown: true,
    predictionShown: false,
    affectedShown: false,
    hash: '7a5c0063',
    packages: [APP],
    edges: [],
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions: null,
    tasks: TASKS,
    atomGroups: []
  };

  return state;
};

const ROOT_RECORD = packageOf('//', '', [], 0);

/** The host's `//` package of a repo with other packages while scopes are hidden: its prefixed bare name, sized for it. */
const PREFIXED_ROOT: GraphPackage = { ...ROOT_RECORD, bareName: '(root) savings', sizeName: '(root) savings' };

/**
 * `taskRootState(false)` as the host sends it for a repo whose root `//` is also listed as a package, labelled
 * `savings`: the root reads `(root) savings`. Hash `7a5c0064`, so the page draws the root instead of relabelling.
 */
export const taskRootListedState = (): GraphReady => {
  const hidden = taskRootState(false);
  const state: GraphReady = { ...hidden, hash: '7a5c0064', packages: [PREFIXED_ROOT, APP] };

  return state;
};
