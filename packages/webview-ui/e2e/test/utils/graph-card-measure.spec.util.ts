import type { BoldGlyphWidths, BoldGlyphs, BoldRow, FontCheck } from '../common/graph-card-measure.type.ts';

/** Runs in the page: the canvas advance of a card's bold row 1, in the body's font family, as the card sizer measures it. */
export const boldRowWidth = async ({ name, isGlyphed, blank, px }: BoldRow): Promise<number> => {
  const family = getComputedStyle(document.body).fontFamily;
  const font = isGlyphed ? `bold ${px}px codicon, ${family}` : `bold ${px}px ${family}`;
  const text = isGlyphed ? `${blank} ${name}` : name;
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) return 0;

  await document.fonts.load(font, text);

  context.font = font;

  return context.measureText(text).width;
};

/** Runs in the page: the canvas advance of each glyph at bold weight in `font` and in the body font family; empty when the page has no 2d context. */
export const boldGlyphWidths = async ({ font, glyphs, px }: BoldGlyphs): Promise<BoldGlyphWidths> => {
  const context = document.createElement('canvas').getContext('2d');
  const none: BoldGlyphWidths = { codicon: [], body: [] };

  if (context === null) return none;

  await document.fonts.load(font, glyphs.join(''));

  context.font = font;

  const codicon = glyphs.map((glyph: string): number => context.measureText(glyph).width);

  context.font = `bold ${px}px ${getComputedStyle(document.body).fontFamily}`;

  const body = glyphs.map((glyph: string): number => context.measureText(glyph).width);

  const widths: BoldGlyphWidths = { codicon, body };

  return widths;
};

/** Runs in the page: whether every face `font` names for `text` has loaded. */
export const isFontLoaded = ({ font, text }: FontCheck): boolean => document.fonts.check(font, text);
