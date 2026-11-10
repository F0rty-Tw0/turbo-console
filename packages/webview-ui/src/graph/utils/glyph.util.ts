import { predictionClassOf } from './prediction-class.util.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { ATOM_OUTCOME_CLASSES } from '../common/graph-atom.const.ts';
import { GLYPH_CODE_POINTS } from '../common/graph-glyph.const.ts';
import { LIVE_RUN_STATES, RUN_CLASS_PREFIX, RUN_STATE_ICONS } from '../common/graph-task.const.ts';

const runStateOf = (classes: string[], states: GraphRunState[]): GraphRunState | undefined => {
  const state = states.find((candidate) => classes.includes(`${RUN_CLASS_PREFIX}${candidate}`));

  return state;
};

const predictedGlyphOf = (classes: string[]): string | undefined => {
  const isCached = classes.includes(predictionClassOf('cached'));
  const isUnknown = classes.includes(predictionClassOf('unknown'));

  if (isCached) return GLYPH_CODE_POINTS.history;

  if (isUnknown) return GLYPH_CODE_POINTS.question;

  return undefined;
};

const outcomeGlyphOf = (classes: string[]): string => {
  const isPassed = classes.includes(ATOM_OUTCOME_CLASSES.passed);
  const isFailed = classes.includes(ATOM_OUTCOME_CLASSES.failed);
  const isCached = classes.includes(ATOM_OUTCOME_CLASSES.cached);

  if (isPassed) return GLYPH_CODE_POINTS.pass;

  if (isFailed) return GLYPH_CODE_POINTS.error;

  if (isCached) return GLYPH_CODE_POINTS.history;

  return GLYPH_CODE_POINTS.blank;
};

/**
 * The glyph of a node's classes: a live run first, else its cache prediction (`notCached` has none), else an ended run,
 * else its file outcome, else the blank that keeps the slot.
 */
export const glyphOf = (classes: string[]): string => {
  const live = runStateOf(classes, LIVE_RUN_STATES);
  const predicted = predictedGlyphOf(classes);
  const state = runStateOf(classes, RUN_STATES);

  if (live !== undefined) return GLYPH_CODE_POINTS[RUN_STATE_ICONS[live]];

  if (predicted !== undefined) return predicted;

  if (state !== undefined) return GLYPH_CODE_POINTS[RUN_STATE_ICONS[state]];

  return outcomeGlyphOf(classes);
};
