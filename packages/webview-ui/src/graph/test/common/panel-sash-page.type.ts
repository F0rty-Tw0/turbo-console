import type { Mock } from 'vitest';

import type { PanelWidths } from '../../../bridge/common/graph-view-state.type.ts';
import type { PanelSashDeps } from '../../common/panel-sash.type.ts';

/** A graph page's sash surroundings on fake elements: what `wirePanelSashes` reads, and the ticks a spec fires at it. */
export type PanelSashPageMock = {
  readonly deps: PanelSashDeps;
  /** The custom properties written to the body, by name. */
  readonly written: Record<string, string>;
  /** How many times `body.clientWidth` has been read so far. */
  readonly widthReads: () => number;
  readonly saved: Mock<(widths: PanelWidths) => void>;
  /** The body is `px` wide from now on; nothing observes it until `resizeBody`. */
  readonly setWidth: (px: number) => void;
  /** Runs the body's ResizeObserver callbacks, as a width or height change does. */
  readonly resizeBody: () => void;
  /** Runs the root's MutationObserver callbacks, as a class change does. */
  readonly mutateRoot: () => void;
  readonly flipOverlay: (matches: boolean) => void;
};
