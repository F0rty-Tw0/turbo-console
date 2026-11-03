import type { GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

/** A runnable task `<packageName>#<name>` whose command is its name: a turbo task with no dependency unless told otherwise. */
export const taskOf = (packageName: string, name: string, isTurboTask = true, dependencies: string[] = []): GraphTask => {
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
