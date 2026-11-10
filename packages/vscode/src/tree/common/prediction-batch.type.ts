import type { PredictionView } from './prediction.type.ts';

/** One dry run of a root, waiting for its window or running: the packages it carries and the abort that stops it. */
export type PredictionTicket = {
  readonly root: string;
  readonly members: Set<string>;
  readonly controller: AbortController;
};

/** The prediction of one `(root, packageName)`: its last answer, if any, and the run that will replace it, if any. */
export type PredictionEntry = {
  readonly root: string;
  readonly packageName: string;
  readonly view: PredictionView | null;
  readonly ticket: PredictionTicket | null;
};
