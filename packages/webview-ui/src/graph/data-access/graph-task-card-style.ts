import type { Css, NodeSingular, StylesheetJsonBlock } from 'cytoscape';

import { CARD_LINE_HEIGHT, CARD_PADDING_X, TASK_CARD_CLASS } from '../common/graph-card.const.ts';
import type { CardMeasures } from '../common/graph-card.type.ts';
import { FOCUS_TARGET_CLASS } from '../common/graph.const.ts';
import { cardMarginXOf, cardRowsOf } from '../utils/card-label.util.ts';

// grug: default for specs; the page always passes real measures
export const UNMEASURED_CARDS: CardMeasures = { regular: () => 0, bold: () => 0 };

const cardWidthOf = (node: NodeSingular): number => Number(node.data('width'));

const cardNameOf = (node: NodeSingular): string => String(node.data('label'));

/** `selected` and `focus-target` are the two classes `graph-selection-style` draws bold. */
const isBoldOf = (node: NodeSingular): boolean => node.hasClass('selected') || node.hasClass(FOCUS_TARGET_CLASS);

/** A card's label rows joined at the one newline it wraps at. */
const labelOf = (hasGlyph: boolean): ((node: NodeSingular) => string) => {
  const textOf = (node: NodeSingular): string => cardRowsOf(node.classes(), cardNameOf(node), hasGlyph).join('\n');

  return textOf;
};

/**
 * The margin that puts the left edge of the label block one padding in from the card's left edge, whatever the block's
 * width: the block is centred, its width is its widest row at the weight the card draws.
 */
const marginXOf = (hasGlyph: boolean, measures: CardMeasures): ((node: NodeSingular) => number) => {
  const marginOf = (node: NodeSingular): number => {
    const measure = isBoldOf(node) ? measures.bold : measures.regular;
    const rows = cardRowsOf(node.classes(), cardNameOf(node), hasGlyph);
    const rowWidths = rows.map(measure);
    const blockWidth = Math.max(...rowWidths);

    return cardMarginXOf(blockWidth, cardWidthOf(node));
  };

  return marginOf;
};

/** The wrap width: the card and one padding, so a row never wraps and the block may overhang the margin of a long name. */
const maxWidthOf = (node: NodeSingular): string => `${cardWidthOf(node) + CARD_PADDING_X}px`;

/**
 * A plain task's card label: `<glyph> <name>` over its state word, wrapped only at the newline and left-justified, its
 * block starting 12 px in. Selects `node.task-card`, never `node.task`: umbrellas carry `task` too.
 */
export const cardRulesOf = (glyphFamily: string | null, measures: CardMeasures): StylesheetJsonBlock[] => {
  const hasGlyph = glyphFamily !== null;
  const card: Css.Node = {
    label: labelOf(hasGlyph),
    'text-wrap': 'wrap',
    'text-justification': 'left',
    'text-halign': 'center',
    'text-valign': 'center',
    'line-height': CARD_LINE_HEIGHT,
    'text-max-width': maxWidthOf,
    'text-margin-x': marginXOf(hasGlyph, measures)
  };
  const rules: StylesheetJsonBlock[] = [{ selector: `node.${TASK_CARD_CLASS}`, style: card }];

  return rules;
};
