import type { ModuleMeasures, ModuleScene } from './module-scene.type.ts';
import type { Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';

export type ModuleElementKind = 'box' | 'file' | 'dir' | 'stub';

/**
 * A laid-out scene: leaf centres and link routes from the layout (no routes from the fallback engine), and the measures
 * it was laid out with, which size the cards and box titles.
 */
export type ModuleDrawing = {
  readonly scene: ModuleScene;
  readonly positions: Positions;
  readonly routes: Routes;
  readonly measures: ModuleMeasures;
};

/** The modules graph on the one Cytoscape core; `show` removes every element first, as the task canvas does. */
export type ModuleCanvas = {
  /**
   * Draws `drawing` and keeps the chosen card while a card holds it, painting that card: the chosen one, or the folder
   * card now collapsed over it. Otherwise, as for a test file now hidden, the choice is dropped and nothing is painted.
   */
  readonly show: (drawing: ModuleDrawing) => void;
  /** Removes every element and forgets the chosen card and the scene drawn last. */
  readonly clear: () => void;
  /**
   * Chooses `id` and paints the card that holds it in the scene drawn last (the folder card collapsed over a file):
   * that card is selected and its 1-hop neighbours highlighted, the rest dimmed; `null`, or no card holding it, paints
   * all normal. It keeps the choice even when no card holds it, and the next `show` then drops it; the canvas input
   * only ever passes a tapped card's id, which a card of the scene drawn last holds, or `null`.
   */
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
