import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { ATOM_OUTCOME_CLASSES } from '../common/graph-atom.const.ts';
import { GLYPH_CODE_POINTS } from '../common/graph-glyph.const.ts';
import { RUN_CLASS_PREFIX, RUN_STATE_ICONS } from '../common/graph-task.const.ts';

const runStateOf = (classes: string[]): GraphRunState | undefined => {
  const state = RUN_STATES.find((candidate) => classes.includes(`${RUN_CLASS_PREFIX}${candidate}`));

  return state;
};

/** The glyph of a node's classes: its run state first, else its file outcome, else the blank that keeps the slot. */
export const glyphOf = (classes: string[]): string => {
  const state = runStateOf(classes);
  const isPassed = classes.includes(ATOM_OUTCOME_CLASSES.passed);
  const isFailed = classes.includes(ATOM_OUTCOME_CLASSES.failed);
  const isCached = classes.includes(ATOM_OUTCOME_CLASSES.cached);

  if (state !== undefined) return GLYPH_CODE_POINTS[RUN_STATE_ICONS[state]];

  if (isPassed) return GLYPH_CODE_POINTS.pass;

  if (isFailed) return GLYPH_CODE_POINTS.error;

  if (isCached) return GLYPH_CODE_POINTS.history;

  return GLYPH_CODE_POINTS.blank;
};
