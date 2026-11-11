import { packageOf } from './graph-package.spec.util.ts';
import { positionsOf } from './graph-positions.spec.util.ts';
import { taskOf } from './graph-task-of.spec.util.ts';
import type { GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

const EDGES: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'web', target: 'core' },
  { source: 'docs', target: 'ui' },
  { source: 'ui', target: 'core' },
  { source: 'core', target: 'utils' },
  { source: 'lint', target: 'core' },
  { source: 'build', target: 'utils' }
];

/** Seven packages in `apps`, `libs` and `tools`, with no cached positions: the shot lays them out with ELK, grouped. */
export const foldersShotState = (): GraphReady => {
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown: true,
    scriptsShown: true,
    predictionShown: false,
    affectedShown: false,
    hash: '5407d001',
    packages: [
      packageOf('web', 'apps/web'),
      packageOf('docs', 'apps/docs'),
      packageOf('ui', 'libs/ui'),
      packageOf('core', 'libs/core'),
      packageOf('utils', 'libs/utils'),
      packageOf('lint', 'tools/lint'),
      packageOf('build', 'tools/build')
    ],
    edges: EDGES,
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions: null,
    tasks: [],
    atomGroups: []
  };

  return state;
};

const PACKAGE_RUN_SHOT_TASKS: GraphTask[] = [
  taskOf('web', 'build'),
  taskOf('ui', 'build'),
  taskOf('core', 'build'),
  taskOf('lint', 'build'),
  taskOf('build', 'build')
];

/** `foldersShotState()` with a build task in web, ui, core, lint and build: the runs of a shot give some of them a state. */
export const packageRunShotState = (): GraphReady => {
  const base = foldersShotState();
  const state: GraphReady = { ...base, tasks: PACKAGE_RUN_SHOT_TASKS };

  return state;
};

/** `foldersShotState()` with the seven packages at fixed centres, so a top-row package sits in its box's top row at any zoom. */
export const placedFoldersShotState = (): GraphReady => {
  const base = foldersShotState();
  const folderPositions = positionsOf([
    ['web', 0, 0],
    ['docs', 200, 0],
    ['ui', 0, 150],
    ['core', 0, 270],
    ['utils', 200, 270],
    ['lint', 400, 150],
    ['build', 400, 270]
  ]);
  const state: GraphReady = { ...base, folderPositions };

  return state;
};
