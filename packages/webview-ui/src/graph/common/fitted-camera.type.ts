import type { GraphView } from './graph-page.type.ts';

type ContainerResize = {
  /**
   * The container resized: `cy.resize()` at once, and while fitted fit again, then `onRefit`; while a node or box is
   * grabbed, that fit waits for its release.
   */
  readonly resized: () => void;
};

/** The camera of one page: it knows whether the user has left it where `fit` put it. */
export type FittedCamera = Pick<GraphView, 'fit' | 'setViewport' | 'centreOn' | 'panBy' | 'isFitted'> & ContainerResize;
