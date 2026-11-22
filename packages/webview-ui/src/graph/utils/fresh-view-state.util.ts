import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState, ModulesViewState, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import { DEFAULT_TASK_DEPTH } from '../common/graph-task.const.ts';
import { DEFAULT_DEPTH } from '../common/graph.const.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/** The view state of a graph with nothing saved: the default camera, no selection, the controls' defaults, no inspection, package mode, no task or modules view and no panel widths. */
export const freshViewStateOf = (hash: string): GraphViewState => {
  const state: GraphViewState = {
    hash,
    zoom: 1,
    pan: ORIGIN,
    fitted: false,
    selected: null,
    controlsOpen: true,
    search: '',
    depth: DEFAULT_DEPTH,
    hidden: [],
    focus: null,
    tags: [],
    detailsOpen: true,
    link: null,
    trace: null,
    folder: null,
    grouped: true,
    collapsed: [],
    mode: 'packages',
    task: null,
    modules: null,
    panelWidths: null
  };

  return state;
};

const TESTS_HIDDEN: ModulesViewState['shown'] = { types: true, tests: false, lazies: true };

/** The modules view of `packageName` with nothing saved: the expansion not set up yet, every kind but test files shown and a camera that fits. */
export const freshModulesViewOf = (packageName: string): ModulesViewState => {
  const modules: ModulesViewState = { packageName, expanded: null, shown: TESTS_HIDDEN, camera: null };

  return modules;
};

/** The task view with nothing saved: nothing chosen, the cap on, the default depth, no search and the default camera. */
export const freshTaskViewOf = (): TaskViewState => {
  const task: TaskViewState = {
    chosen: [],
    capLifted: false,
    depth: DEFAULT_TASK_DEPTH,
    selected: null,
    search: '',
    zoom: 1,
    pan: ORIGIN,
    fitted: false,
    layoutKey: ''
  };

  return task;
};
