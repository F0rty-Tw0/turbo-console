import { GLYPH_CODE_POINTS } from '../common/graph-glyph.const.ts';
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
