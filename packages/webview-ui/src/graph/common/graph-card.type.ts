import type { TextMeasure } from './graph-page.type.ts';

/** The two weights a card label is measured at: `bold` for a selected card or a focus target. */
export type CardMeasures = {
  readonly regular: TextMeasure;
  readonly bold: TextMeasure;
};

/** What the page draws its labels in: the body family, whether the codicon font arrived, and the card measures. */
export type GraphFonts = {
  readonly family: string;
  readonly glyphs: boolean;
  readonly cards: CardMeasures;
};
