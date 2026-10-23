import type { Positions } from '../../bridge/common/graph-state.type.ts';
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

/** What the view's events reach; `filtering` and `layouts` are read per event, since the view is built before them. */
type ViewHandlerTargets = {
  readonly frames: Pick<FrameClock, 'mark'>;
  readonly filtering: () => HandledFiltering;
  readonly layouts: () => HandledLayouts;
};

const BACKGROUND: InspectionInput = { kind: 'background' };

/** Routes each Cytoscape event to the inspection, the folders, the layouts or the frame clock. */
export const viewHandlersOf = (targets: ViewHandlerTargets): GraphViewHandlers => {
  const { frames, filtering, layouts } = targets;
  const handlers: GraphViewHandlers = {
    onTapNode: (name: string): void => filtering().inspection.tapNode(name),
    onTapEdge: (source: string, target: string): void => filtering().inspection.tapEdge(source, target),
    onTapBackground: (): void => filtering().inspection.input(BACKGROUND),
    onTapFolder: (folder: string): void => filtering().inspection.tapFolder(folder),
    onDoubleTapNode: (name: string): void => filtering().inspection.openDetailsOf(name),
    onDoubleTapFolder: (folder: string): void => filtering().folders.toggle(folder),
    onDragEnd: (positions: Positions): void => layouts().dragged(positions),
    onViewport: (): void => filtering().inspection.saveViewport(),
    onRender: (): void => {
      frames.mark();
      filtering().rendered();
    }
  };

  return handlers;
};
