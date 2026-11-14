import { glyphOf } from './glyph.util.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import { CARD_IDLE_TEXT, CARD_PADDING_X } from '../common/graph-card.const.ts';
import { LIVE_RUN_STATES, RUN_CLASS_PREFIX, RUN_STATE_TEXT } from '../common/graph-task.const.ts';

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

/** Whether the classes hold a live run (`running` or `continuous`), the only states that draw a clock. */
const isLiveClass = (classes: string[]): boolean => LIVE_RUN_STATES.some((state) => classes.includes(`${RUN_CLASS_PREFIX}${state}`));

/** Row 2 of a card: the state word, then ` · ` and the clock while the run is live; an ended run's stale clock is never drawn. */
const stateRowOf = (classes: string[], clock: string | undefined): string => {
  const word = cardStateWordOf(classes);
  const isLive = isLiveClass(classes);

  if (clock === undefined || !isLive) return word;

  return `${word} · ${clock}`;
};

/** The two rows of a card label: the state glyph (when the page draws glyphs) and the name, then the state row. */
export const cardRowsOf = (classes: string[], name: string, hasGlyph: boolean, clock?: string): [string, string] => {
  const nameRow = hasGlyph ? `${glyphOf(classes)} ${name}` : name;
  const rows: [string, string] = [nameRow, stateRowOf(classes, clock)];

  return rows;
};
