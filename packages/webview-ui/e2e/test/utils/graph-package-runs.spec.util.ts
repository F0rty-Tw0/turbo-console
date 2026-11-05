import { placedBoardsState } from './graph-folder-states.spec.util.ts';
import { taskOf } from './graph-task-of.spec.util.ts';
import type { GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

const tasks: GraphTask[] = [
  taskOf('web', 'build'),
  taskOf('web', 'test'),
  taskOf('docs', 'build'),
  taskOf('@acme/ui', 'build'),
  taskOf('@acme/utils', 'build')
];

/** `placedBoardsState()` with a build task in every package and a test task in web. */
export const packageRunsState = (): GraphReady => {
  const base = placedBoardsState();
  const state: GraphReady = { ...base, tasks };

  return state;
};
