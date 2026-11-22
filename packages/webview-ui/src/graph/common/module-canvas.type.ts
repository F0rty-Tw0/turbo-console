import type { ModuleMeasures, ModuleScene } from './module-scene.type.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';

export type ModuleElementKind = 'box' | 'file' | 'dir' | 'stub';

/** A laid-out scene: leaf centres from the layout, and the measures it was laid out with, which size the cards and box titles. */
export type ModuleDrawing = {
  readonly scene: ModuleScene;
  readonly positions: Positions;
  readonly measures: ModuleMeasures;
};

/** The modules graph on the one Cytoscape core; `show` removes every element first, as the task canvas does. */
export type ModuleCanvas = {
  readonly show: (drawing: ModuleDrawing) => void;
  readonly clear: () => void;
  /** `id` selected and its 1-hop neighbours highlighted, the rest dimmed; `null` paints all normal. */
  readonly paint: (id: string | null) => void;
  readonly kindOf: (id: string) => ModuleElementKind | null;
  /** The element's centre in container px; `null` when not drawn. */
  readonly renderedCentre: (id: string) => Position | null;
};

/** What the canvas events reach in modules mode. */
export type HandledModules = {
  readonly isActive: () => boolean;
  readonly tapNode: (id: string) => void;
  readonly doubleTapNode: (id: string) => void;
  readonly tapBackground: () => void;
  readonly saveCamera: () => void;
};
