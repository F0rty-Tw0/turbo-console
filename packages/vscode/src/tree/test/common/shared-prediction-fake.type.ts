import type { PredictionListener, SharedPrediction } from '../../common/prediction.type.ts';

/** What a fake adds to `SharedPrediction`: `emit` tells every subscribed listener that the view of `root` changed. */
type PredictionEmitter = {
  readonly emit: PredictionListener;
};

/** A `SharedPrediction` whose members are spies, plus its emitter. */
export type SharedPredictionFake = SharedPrediction & PredictionEmitter;
