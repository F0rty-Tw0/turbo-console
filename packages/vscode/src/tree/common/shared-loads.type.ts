import type { SharedAffected } from './affected.type.ts';
import type { SharedAtoms } from './atom-load.type.ts';
import type { SharedPrediction } from './prediction.type.ts';

/** The loads one window shares: the Atomizer's, the cache prediction's and the affected tasks'. `dispose` ends both stores that follow a toggle. */
export type SharedLoads = {
  readonly atoms: SharedAtoms;
  readonly prediction: SharedPrediction;
  readonly affected: SharedAffected;
  readonly dispose: () => void;
};
