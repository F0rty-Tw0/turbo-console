import type { LabelFontInput } from '../../common/graph-theme.type.ts';

/** Runs in the page: each text's width in px at `font` in the body's font family, the one the canvas labels use. */
export const labelWidthsOf = async ({ texts, font }: LabelFontInput): Promise<number[]> => {
  await document.fonts.ready;

  const family = getComputedStyle(document.body).fontFamily;
  const canvas = new OffscreenCanvas(1, 1);
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('No 2D context to measure the labels');

  context.font = `${font} ${family}`;

  const widthOf = (text: string): number => context.measureText(text).width;

  return texts.map(widthOf);
};
