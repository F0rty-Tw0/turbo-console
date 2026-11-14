import type { Css, NodeSingular, StylesheetJsonBlock } from 'cytoscape';

import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { CARD_HEIGHT, CARD_LINE_HEIGHT, CARD_PADDING_X, TASK_CARD_CLASS } from '../common/graph-card.const.ts';
import type { CardMeasures } from '../common/graph-card.type.ts';
import { RUN_CLASS_PREFIX } from '../common/graph-task.const.ts';
import { FOCUS_TARGET_CLASS } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { cardMarginXOf, cardRowsOf } from '../utils/card-label.util.ts';

/** The run-colour bar along a card's top edge, in px. */
const CARD_ACCENT_PX = 3;

/** Where the bar ends and the card fill starts down the gradient, in percent of the card's height. */
const ACCENT_STOP_PERCENT = (CARD_ACCENT_PX * 100) / CARD_HEIGHT;

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

/** The gradient stops where `bar` ends and `fill` starts, hard: 0 to the bar's 3 px, then the fill to the card's bottom. */
const ACCENT_STOP_POSITIONS = [0, ACCENT_STOP_PERCENT, ACCENT_STOP_PERCENT, 100];

const stopColoursOf = (bar: string, fill: string): string[] => [bar, bar, fill, fill];

/**
 * A plain task's input fill and frame, no outline, then in each run state a 3 px top bar of the run colour over the fill
 * in place of the 2 px run outline. Wired after the task rules, whose `node.run-<state>` outline it replaces: stylesheet
 * order decides, so the first rule resets `outline-width`. Selects `node.task-card`, never `node.task`.
 */
export const cardColourRulesOf = (colors: ThemeColors): StylesheetJsonBlock[] => {
  const card: Css.Node = {
    'background-color': colors.cardFill,
    'border-color': colors.cardFrame,
    'background-fill': 'solid',
    'outline-width': 0
  };
  const barOf = (state: GraphRunState): StylesheetJsonBlock => {
    const style: Css.Node = {
      'background-fill': 'linear-gradient',
      'background-gradient-direction': 'to-bottom',
      'background-gradient-stop-colors': stopColoursOf(colors.runs[state], colors.cardFill),
      'background-gradient-stop-positions': ACCENT_STOP_POSITIONS
    };
    const rule: StylesheetJsonBlock = { selector: `node.${TASK_CARD_CLASS}.${RUN_CLASS_PREFIX}${state}`, style };

    return rule;
  };
  const bars = RUN_STATES.map(barOf);
  const rules: StylesheetJsonBlock[] = [{ selector: `node.${TASK_CARD_CLASS}`, style: card }, ...bars];

  return rules;
};

/**
 * A selected card with a run state: a gradient ignores `background-color`, so the selection fill reaches the card below
 * the bar only through its stops. None when the theme sets no selection colours: the stops keep the card fill.
 */
export const selectedCardRunRulesOf = (colors: ThemeColors): StylesheetJsonBlock[] => {
  const { selection } = colors;

  if (selection === null) return [];

  const ruleOf = (state: GraphRunState): StylesheetJsonBlock => {
    const style: Css.Node = { 'background-gradient-stop-colors': stopColoursOf(colors.runs[state], selection.fill) };
    const rule: StylesheetJsonBlock = { selector: `node.${TASK_CARD_CLASS}.selected.${RUN_CLASS_PREFIX}${state}`, style };

    return rule;
  };

  return RUN_STATES.map(ruleOf);
};
