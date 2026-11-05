import { placedBoardsState } from './graph-folder-states.spec.util.ts';
import { taskOf } from './graph-task-of.spec.util.ts';
import type { GraphReady, GraphRunState, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

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

/** web builds while its test failed. */
export const WEB_RUNNING_AND_FAILED: Readonly<Record<string, GraphRunState>> = { 'web#build': 'running', 'web#test': 'failed' };

/** web built and its test failed. */
export const WEB_PASSED_AND_FAILED: Readonly<Record<string, GraphRunState>> = { 'web#build': 'passed', 'web#test': 'failed' };

/** ui builds while utils built. */
export const UI_RUNNING_UTILS_PASSED: Readonly<Record<string, GraphRunState>> = {
  '@acme/ui#build': 'running',
  '@acme/utils#build': 'passed'
};
