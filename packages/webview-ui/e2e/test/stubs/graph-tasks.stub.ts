import { DIAMOND_CHAIN_STUB } from './graph-state.stub.ts';
import type { GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

const BASE_TASKS: GraphTask[] = [
  { id: 'base#build', packageName: 'base', name: 'build', command: 'tsc', isRunnable: true, dependencies: [] },
  { id: 'base#test', packageName: 'base', name: 'test', command: 'vitest run', isRunnable: true, dependencies: ['base#build'] }
];

/** The diamond with two tasks on `base`. */
export const TASKS_STATE_STUB: GraphReady = { ...DIAMOND_CHAIN_STUB, tasks: BASE_TASKS };
