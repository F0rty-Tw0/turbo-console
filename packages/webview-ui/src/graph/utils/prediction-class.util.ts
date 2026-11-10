import type { GraphPrediction } from '../../bridge/common/graph-message.type.ts';
import { PREDICTION_CLASS_PREFIX } from '../common/graph-task.const.ts';

/** The class a task node carries for its cache prediction word. */
export const predictionClassOf = (word: GraphPrediction): string => `${PREDICTION_CLASS_PREFIX}${word}`;
