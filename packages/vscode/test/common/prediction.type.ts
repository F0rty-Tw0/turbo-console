import type { ShownManifest, SpawnCounter } from './launch.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/**
 * Three packages of the fixture with no Atomizer umbrella, so their dry runs are all predictions: `a` has a `build` that
 * depends on the `build` of `b`, `c` depends on nothing.
 */
export type PredictionPackages = {
  readonly a: string;
  readonly b: string;
  readonly c: string;
};

/** What the prediction cases share: the window's api, the first root, the spawn counter and the three packages. */
export type PredictionScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly counter: SpawnCounter;
  readonly packages: PredictionPackages;
  readonly manifest: ShownManifest;
};

/** The tree events that redrew package nodes (a prediction settled or failed), counted and timed since `watchSettles` ran. */
export type SettleWatch = {
  readonly count: () => number;
  readonly times: () => number[];
  readonly dispose: () => void;
};
