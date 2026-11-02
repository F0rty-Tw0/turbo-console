import type { GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import { TASK_MODE_STATE_STUB } from '../stubs/graph-task-mode.stub.ts';

const scriptOf = (packageName: string, name: string): GraphTask => {
  const task: GraphTask = {
    id: `${packageName}#${name}`,
    packageName,
    name,
    command: name,
    isRunnable: true,
    isTurboTask: false,
    dependencies: []
  };

  return task;
};

const SCRIPTS: GraphTask[] = [scriptOf('app', 'dev'), scriptOf('lib', 'start')];

/** `TASK_MODE_STATE_STUB` with `app#dev` and `lib#start`, two package scripts; the flag says whether the host lists them as shown. */
export const scriptsTasksState = (scriptsShown: boolean): GraphReady => {
  const tasks: GraphTask[] = [...TASK_MODE_STATE_STUB.tasks, ...SCRIPTS];
  const state: GraphReady = { ...TASK_MODE_STATE_STUB, tasks, scriptsShown };

  return state;
};
