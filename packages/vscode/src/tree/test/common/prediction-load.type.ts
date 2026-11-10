import type { DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';
import type { Mock } from 'vitest';

import type { DeferredDryRun } from './atom-load.type.ts';
import type { FakeClock } from './prediction-clock.type.ts';
import type { PredictionListener, PredictionLoadPorts, SharedPrediction } from '../../common/prediction.type.ts';

/** What a fake adds to `SharedPrediction`: `emit` tells every subscribed listener that the view of `root` changed. */
type PredictionEmitter = {
  readonly emit: PredictionListener;
};

/** A `SharedPrediction` whose members are spies, plus its emitter. */
export type SharedPredictionFake = SharedPrediction & PredictionEmitter;

/** The options of core's `readDryRun` a spec reads; core does not export its own type. */
type ReadDryRunOptions = { readonly signal?: AbortSignal };

/** Core's `readDryRun`, as a spec that mocks the module spies on it. */
export type ReadDryRun = (binary: TurboBinary, request: DryRunRequest, options?: ReadDryRunOptions) => Promise<DryRunState[]>;

/** The states a spec drives one package into; `toState` builds each one from nothing. */
export type PredictionState = 'queued' | 'loading' | 'loaded' | 'failed';

/** The two calls of `PredictionLoads` that `toState` makes; the spec builds the real store over `PredictionHarness.ports`. */
export type PredictionDriver = {
  readonly toggled: (shown: boolean) => void;
  readonly packageShown: (root: string, packageName: string) => void;
};

/** Spied ports whose `dryRun` calls stay pending until the spec settles them, over a clock that fires by hand. */
export type PredictionHarness = FakeClock & PredictionSpies;

/** The spied ports and the levers a spec pulls on them. */
type PredictionSpies = {
  readonly ports: PredictionLoadPorts;
  readonly dryRun: Mock<PredictionLoadPorts['dryRun']>;
  readonly dryRuns: DeferredDryRun[];
  readonly log: Mock<PredictionLoadPorts['log']>;
  readonly changed: Mock<PredictionLoadPorts['changed']>;
  readonly setNow: (ms: number) => void;
  readonly model: (root: string, model: WorkspaceModel | null) => void;
  readonly noBinary: () => void;
  readonly binary: () => void;
};
