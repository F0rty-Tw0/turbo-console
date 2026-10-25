import type { TaskView } from './graph-task.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';

/** What `GraphAtomGroups` reads and writes: the task canvas for the counts lines and the bridge for `shownUmbrellas`. */
export type AtomGroupsDeps = {
  readonly view: Pick<TaskView, 'tasks'>;
  readonly bridge: Pick<Bridge, 'post'>;
};
