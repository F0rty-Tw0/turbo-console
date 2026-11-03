import { packagesOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import { TASK_MODE_STATE_STUB } from '../stubs/graph-task-mode.stub.ts';

const taskOf = (packageName: string, name: string, isTurboTask: boolean, dependencies: string[] = []): GraphTask => {
  const task: GraphTask = {
    id: `${packageName}#${name}`,
    packageName,
    name,
    command: name,
    isRunnable: true,
    isTurboTask,
    dependencies
  };

  return task;
};

const SCRIPTS: GraphTask[] = [taskOf('app', 'dev', false), taskOf('lib', 'start', false)];

/** `TASK_MODE_STATE_STUB` with `app#dev` and `lib#start`, two package scripts; the flag says whether the host lists them as shown. */
export const scriptsTasksState = (scriptsShown: boolean): GraphReady => {
  const tasks: GraphTask[] = [...TASK_MODE_STATE_STUB.tasks, ...SCRIPTS];
  const state: GraphReady = { ...TASK_MODE_STATE_STUB, tasks, scriptsShown };

  return state;
};

/** The one chosen task of `scriptCapState`. */
export const SCRIPT_CAP_ROOT_TASK = 'root#build';

const SCRIPT_CAP_TURBO_DEPENDENTS = 294;

const SCRIPT_CAP_SCRIPT_DEPENDENTS = 10;

const LEAF_NEEDS_ROOT: GraphEdge[] = [{ source: 'leaf', target: 'root' }];

const dependentOf = (index: number, isTurbo: boolean): GraphTask => {
  const prefix = isTurbo ? 't' : 's';
  const name = `${prefix}${index + 1}`;
  const task = taskOf('leaf', name, isTurbo, [SCRIPT_CAP_ROOT_TASK]);

  return task;
};

const dependentsOf = (count: number, isTurbo: boolean): GraphTask[] => {
  const slots = Array.from({ length: count });

  return slots.map((_slot, index) => dependentOf(index, isTurbo));
};

/**
 * `root#build`, 294 turbo dependents and 10 script dependents, one hop away: 295 turbo tasks, 305 with the scripts.
 * The flag says whether the host lists the scripts as shown.
 */
export const scriptCapState = (scriptsShown: boolean): GraphReady => {
  const root = taskOf('root', 'build', true);
  const turbo = dependentsOf(SCRIPT_CAP_TURBO_DEPENDENTS, true);
  const scripts = dependentsOf(SCRIPT_CAP_SCRIPT_DEPENDENTS, false);
  const tasks = [root, ...turbo, ...scripts];
  const state: GraphReady = {
    ...TASK_MODE_STATE_STUB,
    hash: '7a5c0502',
    packages: packagesOf(['leaf', 'root']),
    edges: LEAF_NEEDS_ROOT,
    tasks,
    scriptsShown
  };

  return state;
};
