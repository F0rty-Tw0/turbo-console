import type { GraphView } from './graph-page.type.ts';

type ContainerResize = {
  /** The container resized: `cy.resize()` at once, and while fitted fit again, then `onRefit`. */
  readonly resized: () => void;
};

/** The camera of one page: it knows whether the user has left it where `fit` put it. */
export type FittedCamera = Pick<GraphView, 'fit' | 'setViewport' | 'centreOn' | 'isFitted'> & ContainerResize;
