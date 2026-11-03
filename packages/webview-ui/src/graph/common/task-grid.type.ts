import type { GroupState } from './graph-controls.type.ts';
import type { TaskNaming } from './graph-task.type.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';

/**
 * What the Projects grid lists: the pool tasks, the chosen ids and the drawn ids apart (a pool task that is not drawn is
 * listed but dimmed), how the boxes are named and grouped, and the root label of a single-package root.
 */
export type TaskGridFacts = {
  readonly tasks: GraphTask[];
  readonly chosen: ReadonlySet<string>;
  readonly shown: ReadonlySet<string>;
  readonly naming: TaskNaming;
  readonly rootLabel: string | null;
};

/** What the reader opened: the keys the reader toggled away from their default, and the search text. */
export type TaskGridOpen = {
  readonly toggled: ReadonlySet<string>;
  readonly search: string;
};

/** A folder or project line: `ids` are every pool task it acts on, whatever the search lists, and `state` reads those. */
export type GroupLine = {
  readonly kind: 'folder' | 'project';
  readonly key: string;
  readonly depth: number;
  readonly text: string;
  readonly label: string;
  readonly ids: string[];
  readonly state: GroupState;
  readonly isOpen: boolean;
};

/** A task line: checked when chosen, drawn when it is on the canvas. */
export type TaskLine = {
  readonly kind: 'task';
  readonly key: string;
  readonly depth: number;
  readonly task: GraphTask;
  readonly label: string;
  readonly isChecked: boolean;
  readonly isDrawn: boolean;
};

export type ProjectLine = GroupLine | TaskLine;
