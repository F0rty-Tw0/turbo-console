import type { SharedAtoms } from './atom-load.type.ts';
import type { SharedPrediction } from './prediction.type.ts';

/** The loads one window shares: the Atomizer's and the cache prediction's. */
export type SharedLoads = {
  readonly atoms: SharedAtoms;
  readonly prediction: SharedPrediction;
};
