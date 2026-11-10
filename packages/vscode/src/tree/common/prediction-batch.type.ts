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

/** The two calls a launch makes on the scheduler: a finished run frees its root, a package with nothing to ask leaves. */
export type PredictionBatchPort = {
  readonly finished: (ticket: PredictionTicket) => void;
  readonly leave: (ticket: PredictionTicket, packageName: string) => void;
};

/** The one call a launch makes on the wait list: a package that found no binary or model waits for the next model. */
export type PredictionWaitPort = {
  readonly add: (root: string, packageName: string) => void;
};
