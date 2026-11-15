import type { CardMeasures } from '../../common/graph-card.type.ts';

/** Measures every text as 0 px wide, for the specs that assert nothing on a card's margin. */
export const CARD_MEASURES_STUB: CardMeasures = { regular: () => 0, bold: () => 0 };
