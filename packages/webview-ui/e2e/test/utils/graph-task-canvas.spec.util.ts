import { packageOf } from './graph-package.spec.util.ts';
import { closedPanelsSavedState } from './graph-shot-state.spec.util.ts';
import { taskOf } from './graph-task-of.spec.util.ts';
import { taskViewOf } from './graph-task-saved.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import type { TaskShotSetup } from '../../common/graph-shots.type.ts';

/** `ui` and `core` under `packages/`, `web` under `apps/`, `root-lib` at the repo root and the root package `//`. */
const PACKAGES: GraphPackage[] = [
  packageOf('//', '.', [], 1),
  packageOf('core', 'packages/core', [], 1),
  packageOf('root-lib', 'root-lib', [], 1),
  packageOf('ui', 'packages/ui', [], 1),
  packageOf('web', 'apps/web', [], 2)
];

/** `web#build` needs `ui#build`, which needs `core#build`; `web#dev` is a script; `//#gen` and `root-lib#build` stand alone. */
const TASKS: GraphTask[] = [
  taskOf('//', 'gen', true, []),
  taskOf('core', 'build', true, []),
  taskOf('root-lib', 'build', true, []),
  taskOf('ui', 'build', true, ['core#build']),
  taskOf('web', 'build', true, ['ui#build']),
  taskOf('web', 'dev', false, [])
];

const EDGES: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' }
];

/** Every task id of `taskCanvasState`, in its task list order. */
export const TASK_CANVAS_TASK_IDS = TASKS.map((task) => task.id);

/**
 * Five packages in three folders (`''`, `apps`, `packages`) with a `//#gen` root task and the script `web#dev`, scripts
 * and scopes shown, hash `7a5c0062`. Grouping is the saved view's, so the state is the same grouped or flat.
 */
export const taskCanvasState = (): GraphReady => {
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown: true,
    scriptsShown: true,
    predictionShown: false,
    affectedShown: false,
    hash: '7a5c0062',
    packages: PACKAGES,
    edges: EDGES,
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions: null,
    tasks: TASKS,
    atomGroups: []
  };

  return state;
};

/** `taskCanvasState` opened grouped in task mode on every task, panels closed; the empty layout key makes the camera fit. */
export const taskCanvasShotSetup = (): TaskShotSetup => {
  const state = taskCanvasState();
  const closed = closedPanelsSavedState(state.hash);
  const task = taskViewOf({ chosen: TASK_CANVAS_TASK_IDS });
  const saved: GraphViewState = { ...closed, grouped: true, mode: 'tasks', task };
  const setup: TaskShotSetup = { state, saved };

  return setup;
};
