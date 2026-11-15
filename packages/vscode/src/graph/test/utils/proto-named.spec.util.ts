import type { GraphTask } from '@turbo-console/webview-ui';

/** The task with its id replaced by `__proto__`, the id a plain assignment into a record would lose. */
export const protoNamed = (task: GraphTask): GraphTask => {
  const renamed: GraphTask = { ...task, id: '__proto__' };

  return renamed;
};
