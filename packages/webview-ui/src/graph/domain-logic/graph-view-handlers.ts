import type { Positions } from '../../bridge/common/graph-state.type.ts';
import type { FlowControl } from '../common/flow.type.ts';
import type { FrameClock } from '../common/frame-clock.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';

type HandledInspection = {
  readonly tapNode: (name: string) => void;
  readonly tapEdge: (source: string, target: string) => void;
  readonly input: (input: InspectionInput) => void;
  readonly tapFolder: (folder: string) => void;
  readonly openDetailsOf: (name: string) => void;
  readonly saveViewport: () => void;
  readonly keepClear: () => void;
};

type HandledFolders = {
  readonly toggle: (folder: string) => void;
};

type HandledFiltering = {
  readonly inspection: HandledInspection;
  readonly folders: HandledFolders;
  readonly rendered: () => void;
};

type HandledLayouts = {
  readonly dragged: (positions: Positions) => void;
};

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

type HandledTasks = {
  readonly isActive: () => boolean;
  readonly selection: HandledSelection;
  readonly layout: HandledLayout;
  readonly saveCamera: () => void;
};

/** What the view's events reach; the targets are read per event, since the view is built before them. */
type ViewHandlerTargets = {
  readonly frames: Pick<FrameClock, 'mark'>;
  readonly filtering: () => HandledFiltering;
  readonly layouts: () => HandledLayouts;
  readonly tasks: () => HandledTasks;
  readonly flow: () => Pick<FlowControl, 'viewportChanged'>;
};

const BACKGROUND: InspectionInput = { kind: 'background' };

const NOTHING = (): void => undefined;

const tasksRendered = (tasks: HandledTasks): void => {
  tasks.selection.rendered();
  tasks.layout.atoms.rendered();
};

type ByMode = <Args extends unknown[]>(
  onPackages: (...args: Args) => void,
  onTasks?: (...args: Args) => void
) => (...args: Args) => void;

const byModeOf = (tasks: () => HandledTasks): ByMode => {
  const byMode: ByMode = <Args extends unknown[]>(
    onPackages: (...args: Args) => void,
    onTasks: (...args: Args) => void = NOTHING
  ): ((...args: Args) => void) => {
    const handle = (...args: Args): void => {
      const isTaskMode = tasks().isActive();

      if (isTaskMode) onTasks(...args);
      else onPackages(...args);
    };

    return handle;
  };

  return byMode;
};

/**
 * Routes each Cytoscape event by mode: in package mode to the inspection, the folders or the layouts; in task mode a
 * drag, a camera move, a node tap, a background tap and a frame to task mode, and every other tap to nothing. Every frame
 * marks the frame clock first; every camera move clears the flow overlay first.
 */
export const viewHandlersOf = (targets: ViewHandlerTargets): GraphViewHandlers => {
  const { frames, filtering, layouts, tasks, flow } = targets;
  const byMode = byModeOf(tasks);
  const saveViewport = byMode(
    (): void => filtering().inspection.saveViewport(),
    (): void => tasks().saveCamera()
  );
  const openDetails = (name: string): void => filtering().inspection.openDetailsOf(name);
  const toggleAtoms = (id: string): void => tasks().layout.atoms.toggle(id);
  const handlers: GraphViewHandlers = {
    onTapNode: byMode(
      (name: string): void => filtering().inspection.tapNode(name),
      (id: string): void => tasks().selection.tapNode(id)
    ),
    onTapEdge: byMode((source: string, target: string): void => filtering().inspection.tapEdge(source, target)),
    onTapBackground: byMode(
      (): void => filtering().inspection.input(BACKGROUND),
      (): void => tasks().selection.clear()
    ),
    onTapFolder: byMode((folder: string): void => filtering().inspection.tapFolder(folder)),
    onDoubleTapNode: byMode(openDetails, toggleAtoms),
    onDoubleTapFolder: byMode((folder: string): void => filtering().folders.toggle(folder)),
    onDragEnd: byMode(
      (positions: Positions): void => layouts().dragged(positions),
      (): void => tasks().layout.dragged()
    ),
    onViewport: (): void => {
      flow().viewportChanged();
      saveViewport();
    },
    onRefit: byMode(
      (): void => filtering().inspection.keepClear(),
      (): void => tasks().selection.keepClear()
    ),
    onHoverNode: byMode<[string | null]>(NOTHING, (id: string | null): void => tasks().selection.hover(id)),
    onRender: (): void => {
      const isTaskMode = tasks().isActive();

      frames.mark();

      if (isTaskMode) tasksRendered(tasks());
      else filtering().rendered();
    }
  };

  return handlers;
};
