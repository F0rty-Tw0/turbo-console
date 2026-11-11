import type { GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import { packagesOf } from '../utils/graph-package.spec.util.ts';

const taskOf = (name: string, dependencies: string[]): GraphTask => {
  const task: GraphTask = {
    id: `//#${name}`,
    packageName: '//',
    name,
    command: name,
    isRunnable: true,
    isTurboTask: true,
    dependencies
  };

  return task;
};

const TASKS: GraphTask[] = [taskOf('build', []), taskOf('lint', []), taskOf('test:unit', ['//#build'])];

/** A single-package repo labelled `single-app`: its root package `//` holds `//#build`, `//#lint` and `//#test:unit` (which needs the build), hash `5ee0a001`. */
export const SINGLE_PACKAGE_TASKS_STUB: GraphReady = {
  kind: 'graph',
  singlePackage: true,
  rootLabel: 'single-app',
  scopeShown: true,
  scriptsShown: true,
  predictionShown: false,
  affectedShown: false,
  hash: '5ee0a001',
  packages: packagesOf(['//']),
  edges: [],
  positions: null,
  routes: null,
  folderRoutes: null,
  folderPositions: null,
  tasks: TASKS,
  atomGroups: []
};
