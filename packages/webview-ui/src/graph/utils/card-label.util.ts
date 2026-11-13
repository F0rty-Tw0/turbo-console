import { glyphOf } from './glyph.util.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import { CARD_IDLE_TEXT, CARD_PADDING_X } from '../common/graph-card.const.ts';
import { RUN_CLASS_PREFIX, RUN_STATE_TEXT } from '../common/graph-task.const.ts';

/**
 * The `text-margin-x` that starts a centred label block on the card's left padding: the block is as wide as its widest
 * row, the room it has is the card less one padding on each side.
 */
export const cardMarginXOf = (blockWidth: number, cardWidth: number): number => (blockWidth - (cardWidth - CARD_PADDING_X)) / 2;

/** Row 2 of a card: the word of its run state class, else `CARD_IDLE_TEXT`; a prediction never changes it. */
export const cardStateWordOf = (classes: string[]): string => {
  const state = RUN_STATES.find((candidate) => classes.includes(`${RUN_CLASS_PREFIX}${candidate}`));

  if (state === undefined) return CARD_IDLE_TEXT;

  return RUN_STATE_TEXT[state];
};

/** The two rows of a card label: the state glyph (when the page draws glyphs) and the name, then the state word. */
export const cardRowsOf = (classes: string[], name: string, hasGlyph: boolean): [string, string] => {
  const nameRow = hasGlyph ? `${glyphOf(classes)} ${name}` : name;
  const rows: [string, string] = [nameRow, cardStateWordOf(classes)];

  return rows;
};
