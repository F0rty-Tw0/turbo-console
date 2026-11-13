import { CARD_HEIGHT, CARD_MIN_WIDTH, CARD_PADDING_X, CARD_STATE_WORDS } from '../common/graph-card.const.ts';
import { GLYPH_CODE_POINTS, PACKAGE_GLYPH } from '../common/graph-glyph.const.ts';
import type { NodeSizer, TextMeasure } from '../common/graph-page.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { nodeSizeOf } from '../utils/node-size.util.ts';

/** Measures text in `font` on a canvas, as the graph draws it; `font` is a canvas `ctx.font` value, which cannot resolve `var(...)`. */
export const textMeasure = (font: string): TextMeasure => {
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) throw new Error('graph page: no 2d canvas context to measure labels');

  context.font = font;

  const measure = (text: string): number => context.measureText(text).width;

  return measure;
};

/** The node sizer of a label drawn as its bare text. */
export const labelSizer = (measure: TextMeasure): NodeSizer => {
  const sizeOf = (name: string): NodeSize => nodeSizeOf(measure(name));

  return sizeOf;
};

/** The node sizer of a label drawn after a state glyph: always the blank glyph's slot, so a node's width never depends on its state. */
export const slotSizer = (measure: TextMeasure): NodeSizer => {
  const sizeOf = (name: string): NodeSize => nodeSizeOf(measure(`${GLYPH_CODE_POINTS.blank} ${name}`));

  return sizeOf;
};

/** The node sizer of a package task box title: the package glyph, a space and the name, as the box draws it. */
export const packageTitleSizer = (measure: TextMeasure): NodeSizer => {
  const sizeOf = (name: string): NodeSize => nodeSizeOf(measure(`${PACKAGE_GLYPH} ${name}`));

  return sizeOf;
};

/** The task nodes' sizer: the glyph slot, measured in `glyphMeasure`, when the page draws glyphs, else the bare label in `measure`. */
export const taskSizerOf = (glyphs: boolean, measure: TextMeasure, glyphMeasure: TextMeasure): NodeSizer => {
  const slot = slotSizer(glyphMeasure);
  const plain = labelSizer(measure);
  const sizer = glyphs ? slot : plain;

  return sizer;
};

/** The package task box titles' sizer: the package glyph and the name, measured in `glyphMeasure`, when the page draws glyphs, else the bare name in `measure`. */
export const boxTitleSizerOf = (glyphs: boolean, measure: TextMeasure, glyphMeasure: TextMeasure): NodeSizer => {
  const withGlyph = packageTitleSizer(glyphMeasure);
  const plain = labelSizer(measure);
  const sizer = glyphs ? withGlyph : plain;

  return sizer;
};

/** The plain task nodes' sizer (state words measured on the first sizing, so a broken measure fails inside layout, not at page start): a 60 px status card at least 180 px wide, as wide as its bold row 1 (the glyph slot always reserved) or its widest state word plus padding. */
export const cardSizerOf = (glyphs: boolean, boldMeasure: TextMeasure, boldGlyphMeasure: TextMeasure): NodeSizer => {
  let stateWidth: number | null = null;
  const stateWidthOf = (): number => {
    if (stateWidth !== null) return stateWidth;

    const stateWidths = CARD_STATE_WORDS.map(boldMeasure);

    stateWidth = Math.max(...stateWidths);

    return stateWidth;
  };
  const rowOf = (name: string): number => {
    const slotted = `${GLYPH_CODE_POINTS.blank} ${name}`;

    if (glyphs) return boldGlyphMeasure(slotted);

    return boldMeasure(name);
  };
  const sizeOf = (name: string): NodeSize => {
    const textWidth = Math.max(rowOf(name), stateWidthOf());
    const width = Math.max(CARD_MIN_WIDTH, textWidth + CARD_PADDING_X);
    const size = { width, height: CARD_HEIGHT };

    return size;
  };

  return sizeOf;
};
