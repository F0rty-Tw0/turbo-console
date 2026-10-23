import { packagesOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

const DEPENDENT_COUNT = 400;

/** The one chosen task of `overCapTasksState`; its 400 dependents put it over the 300-task cap at depth 1. */
export const OVER_CAP_ROOT_TASK = 'root#build';

const dependentOf = (index: number): GraphTask => {
  const name = `t${index + 1}`;
  const task: GraphTask = {
    id: `leaf#${name}`,
    packageName: 'leaf',
    name,
    command: name,
    isRunnable: true,
    dependencies: [OVER_CAP_ROOT_TASK]
  };

  return task;
};

const LEAF_NEEDS_ROOT: GraphEdge[] = [{ source: 'leaf', target: 'root' }];

const ROOT: GraphTask = {
  id: OVER_CAP_ROOT_TASK,
  packageName: 'root',
  name: 'build',
  command: 'build',
  isRunnable: true,
  dependencies: []
};

/** `root#build` and its 400 dependents `leaf#t1` to `leaf#t400`, one hop away, in packages `root` and `leaf`. */
export const overCapTasksState = (): GraphReady => {
  const slots = Array.from({ length: DEPENDENT_COUNT });
  const dependents = slots.map((_slot, index) => dependentOf(index));
  const state: GraphReady = {
    kind: 'graph',
    hash: '7a5c0400',
    packages: packagesOf(['leaf', 'root']),
    edges: LEAF_NEEDS_ROOT,
    positions: null,
    folderPositions: null,
    tasks: [ROOT, ...dependents]
  };

  return state;
};

/** Every task id of `overCapTasksState`. */
export const overCapTaskIds = (): string[] => overCapTasksState().tasks.map((task) => task.id);
