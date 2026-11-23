import type { FlowControl } from '../common/flow.type.ts';
import type { FrameClock } from '../common/frame-clock.type.ts';
import type { GraphDrag, GraphViewHandlers } from '../common/graph-page.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';
import type { HandledModules } from '../common/module-canvas.type.ts';
import type { HandledTasks } from '../common/page-task-mode.type.ts';

type HandledInspection = {
  readonly tap: (input: InspectionInput) => void;
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
  readonly dragged: (drag: GraphDrag) => void;
};

/** What the view's events reach; the targets are read per event, since the view is built before them. */
type ViewHandlerTargets = {
  readonly frames: Pick<FrameClock, 'mark'>;
  readonly filtering: () => HandledFiltering;
  readonly layouts: () => HandledLayouts;
  readonly tasks: () => HandledTasks;
  readonly modules: () => HandledModules;
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
  onTasks?: (...args: Args) => void,
  onModules?: (...args: Args) => void
) => (...args: Args) => void;

/** Modules mode is checked first: it parks task mode, so the two are never active at once. */
const byModeOf = (tasks: () => HandledTasks, modules: () => HandledModules): ByMode => {
  const byMode: ByMode = <Args extends unknown[]>(
    onPackages: (...args: Args) => void,
    onTasks: (...args: Args) => void = NOTHING,
    onModules: (...args: Args) => void = NOTHING
  ): ((...args: Args) => void) => {
    const handle = (...args: Args): void => {
      const isModuleMode = modules().isActive();
      const isTaskMode = tasks().isActive();

      if (isModuleMode) onModules(...args);
      else if (isTaskMode) onTasks(...args);
      else onPackages(...args);
    };

    return handle;
  };

  return byMode;
};

/** A link tap: in package mode to the inspection, in modules mode to modules mode, in task mode to nothing. */
const edgeTapOf = (byMode: ByMode, targets: ViewHandlerTargets): ((source: string, target: string) => void) => {
  const { filtering, modules } = targets;
  const tapLink = (source: string, target: string): void => filtering().inspection.tap({ kind: 'tapLink', source, target });
  const tapModuleLink = (source: string, target: string): void => modules().tapLink(source, target);

  return byMode(tapLink, NOTHING, tapModuleLink);
};

/**
 * Routes each Cytoscape event by mode: in package mode to the inspection, the folders or the layouts; in task mode a
 * drag, a camera move, a node tap, a background tap and a frame to task mode, and every other tap to nothing; in modules
 * mode a node tap or double tap, a link tap, a background tap and a camera move to modules mode, and every other event to
 * nothing.
 * Every frame marks the frame clock first; every camera move clears the flow overlay first.
 */
export const viewHandlersOf = (targets: ViewHandlerTargets): GraphViewHandlers => {
  const { frames, filtering, layouts, tasks, modules, flow } = targets;
  const byMode = byModeOf(tasks, modules);
  const saveViewport = byMode(
    (): void => filtering().inspection.saveViewport(),
    (): void => tasks().saveCamera(),
    (): void => modules().saveCamera()
  );
  const openDetails = (name: string): void => filtering().inspection.openDetailsOf(name);
  const toggleAtoms = (id: string): void => tasks().layout.atoms.toggle(id);
  const rendered = byMode(
    (): void => filtering().rendered(),
    (): void => tasksRendered(tasks())
  );
  const handlers: GraphViewHandlers = {
    onTapNode: byMode(
      (name: string): void => filtering().inspection.tap({ kind: 'select', name, via: 'canvas' }),
      (id: string): void => tasks().selection.tapNode(id),
      (id: string): void => modules().tapNode(id)
    ),
    onTapEdge: edgeTapOf(byMode, targets),
    onTapBundle: byMode((source: string, target: string): void => filtering().inspection.tap({ kind: 'tapBundle', source, target })),
    onTapBackground: byMode(
      (): void => filtering().inspection.input(BACKGROUND),
      (): void => tasks().selection.clear(),
      (): void => modules().tapBackground()
    ),
    onTapFolder: byMode((folder: string): void => filtering().inspection.tapFolder(folder)),
    onDoubleTapNode: byMode(openDetails, toggleAtoms, (id: string): void => modules().doubleTapNode(id)),
    onDoubleTapFolder: byMode((folder: string): void => filtering().folders.toggle(folder)),
    onDragEnd: byMode(
      (drag: GraphDrag): void => layouts().dragged(drag),
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
      frames.mark();
      rendered();
    }
  };

  return handlers;
};
