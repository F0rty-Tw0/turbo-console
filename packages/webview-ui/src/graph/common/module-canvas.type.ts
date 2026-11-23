import type { ModuleMeasures, ModuleScene } from './module-scene.type.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { ModuleSelection } from '../../bridge/common/graph-view-state.type.ts';

export type ModuleElementKind = 'box' | 'file' | 'dir' | 'stub';

/** A laid-out scene: leaf centres from the layout, and the measures it was laid out with, which size the cards and box titles. */
export type ModuleDrawing = {
  readonly scene: ModuleScene;
  readonly positions: Positions;
  readonly measures: ModuleMeasures;
};

/** The modules graph on the one Cytoscape core; `show` removes every element first, as the task canvas does. */
export type ModuleCanvas = {
  /**
   * Draws `drawing` and keeps the choice while `keepsSelection` holds, painting its target: the chosen card, the folder
   * card now collapsed over it, or the link between the cards that hold a chosen link's ends. A kept link whose end sits
   * in an open box paints nothing and stays chosen. Otherwise, as for a test file now hidden, the choice is dropped and
   * nothing is painted.
   */
  readonly show: (drawing: ModuleDrawing) => void;
  /** Removes every element and forgets the choice and the scene drawn last. */
  readonly clear: () => void;
  /**
   * Chooses `sel` and paints its target in the scene drawn last (`paintTargetOf`): a card is selected and its 1-hop
   * neighbours highlighted; a link is selected and its two cards highlighted; the rest is dimmed. `null`, or no target,
   * paints all normal. It keeps the choice even with no target, and the next `show` then keeps or drops it.
   */
  readonly paint: (sel: ModuleSelection | null) => void;
  /** The choice: what `paint` chose last, unless a `show` dropped it or `clear` forgot it. */
  readonly selected: () => ModuleSelection | null;
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
