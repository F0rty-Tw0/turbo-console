import type { TaskToolbarDeps } from '../../common/task-details.type.ts';
import type { TaskToolbarElements } from '../../common/task-toolbar.type.ts';

/** What a `TaskToolbar` is built on: its layer and container, its deps with spied clicks, and the toolbars built so far. */
export type TaskToolbarRig = {
  readonly layer: HTMLElement;
  readonly container: HTMLElement;
  readonly deps: TaskToolbarDeps;
  /** The task toolbars built so far, the latest last. */
  readonly built: TaskToolbarElements[];
};
