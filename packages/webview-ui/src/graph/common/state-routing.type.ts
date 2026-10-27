import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';

/** What the state routing asks of task mode: it reads every graph state first, and says whether it owns the canvas. */
export type RoutedTaskMode = {
  readonly received: (state: GraphReady, at: number) => void;
  readonly isActive: () => boolean;
  /** Turns task mode on; a single-package root has no package graph to show. */
  readonly enter: (at: number) => void;
};

/** What the state routing asks of the package side. */
export type RoutedPackageSide = {
  readonly show: (state: GraphState, at: number) => void;
  /** The hash of the package graph shown or being laid out; `null` while none is. */
  readonly drawnHash: () => string | null;
  /** Draws the package graph drawn before again, with the saved package view. */
  readonly redraw: () => void;
  /** Task mode is being left: a mode button with focus hands it to `modeFocusOf` once the package graph shows. */
  readonly keepModeFocus: () => void;
};

export type StateRoutingDeps = {
  readonly tasks: RoutedTaskMode;
  readonly packages: RoutedPackageSide;
  /** Hides the Packages/Tasks group for a single-package root, shows it otherwise. */
  readonly hideModes: (isHidden: boolean) => void;
  readonly now: () => number;
};
