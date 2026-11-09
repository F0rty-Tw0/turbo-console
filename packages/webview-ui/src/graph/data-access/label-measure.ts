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
