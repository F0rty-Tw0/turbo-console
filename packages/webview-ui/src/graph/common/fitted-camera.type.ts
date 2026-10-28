import type { GraphView } from './graph-page.type.ts';

/** Runs `run` at the next animation frame. */
export type FrameRequest = (run: () => void) => void;

type ContainerResize = {
  /** The container resized: one frame later `cy.resize()`, and while fitted fit again, then `onRefit`. */
  readonly resized: () => void;
};

/** The camera of one page: it knows whether the user has left it where `fit` put it. */
export type FittedCamera = Pick<GraphView, 'fit' | 'setViewport' | 'centreOn' | 'isFitted'> & ContainerResize;
