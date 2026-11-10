import type { ShownManifest, SpawnCounter, SuiteEnv } from './launch.type.ts';
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

/** What the prediction cases share: the window's api and env, the first root, the spawn counter and the three packages. */
export type PredictionScene = {
  readonly api: TurboConsoleApi;
  readonly env: SuiteEnv;
  readonly root: string;
  readonly counter: SpawnCounter;
  readonly packages: PredictionPackages;
  readonly manifest: ShownManifest;
};

/** The `performance.now()` times at which each of a burst's runs ended, sorted, and the last of them. */
export type Burst = {
  readonly ends: number[];
  readonly lastEnd: number;
};
