import type { PredictionState } from './prediction-load.type.ts';

export const PKG_A = '@fx/a';

export const PKG_B = '@fx/b';

export const PKG_C = '@fx/c';

export const ID_A = '@fx/a#build';

export const ID_B = '@fx/b#build';

export const NOW_0 = 1_000;

export const NOW_1 = 2_000;

export const PREDICTION_STATES: PredictionState[] = ['queued', 'loading', 'loaded', 'failed'];

/** The states a run end, a refresh or a new model asks again; a queued package is already on its way. */
export const RESTARTABLE_STATES: PredictionState[] = ['loading', 'loaded', 'failed'];
