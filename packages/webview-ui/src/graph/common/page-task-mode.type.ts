import type { RevealTaskMode } from './graph-reveal.type.ts';
import type { LocationTasks } from './location.type.ts';
import type { FactTasks } from './probe-fact-parts.type.ts';
import type { RoutedTaskMode } from './state-routing.type.ts';
import type { TaskOwners, TaskRuns } from './task-details.type.ts';
import type { GraphAtomGroupState } from '../../bridge/common/graph-atoms-message.type.ts';

type HandledSelection = {
  readonly tapNode: (id: string) => void;
  readonly clear: () => void;
  readonly rendered: () => void;
  readonly keepClear: () => void;
  readonly hover: (id: string | null) => void;
};

type HandledAtoms = {
  readonly toggle: (nodeId: string) => void;
  readonly rendered: () => void;
};

type HandledLayout = {
  readonly atoms: HandledAtoms;
  readonly dragged: () => void;
};

/** What the view's events reach of task mode. */
export type HandledTasks = {
  readonly isActive: () => boolean;
  readonly selection: HandledSelection;
  readonly layout: HandledLayout;
  readonly saveCamera: () => void;
};

type ControlledSelection = {
  readonly runs: (runs: TaskRuns, owners: TaskOwners) => void;
};

type ControlledAtoms = {
  readonly states: (groups: Record<string, GraphAtomGroupState>) => void;
};

type ControlledLayout = {
  readonly atoms: ControlledAtoms;
  readonly relayout: () => Promise<void>;
};

/** What the page controller and `packageTasksOf` call on task mode themselves. */
type ControlledTasks = {
  readonly suspend: () => void;
  readonly notice: (text: string | null) => void;
  readonly showTasks: (taskIds: string[], at: number) => void;
  readonly packageTaskIds: (name: string) => string[];
  readonly selection: ControlledSelection;
  readonly layout: ControlledLayout;
};

/** Task mode as `taskModeOf` hands it to the page controller: what the controller calls, and what each part it passes task mode to asks of it. */
export type PageTaskMode = ControlledTasks & HandledTasks & RoutedTaskMode & RevealTaskMode & LocationTasks & FactTasks;
