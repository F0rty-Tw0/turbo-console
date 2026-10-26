import type { Page } from '@playwright/test';

import { NODE_FONT_SIZE } from '../../../src/graph/common/graph.const.ts';

type MeasureInput = {
  readonly texts: string[];
  readonly fontSize: number;
};

/** Runs in the page: the width of each text in the page's body font at `fontSize` px, as a canvas measures it. */
const textWidthsOf = ({ texts, fontSize }: MeasureInput): number[] => {
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) throw new Error('graph e2e: no 2d canvas context to measure text');

  context.font = `${fontSize}px ${getComputedStyle(document.body).fontFamily}`;

  return texts.map((text): number => context.measureText(text).width);
};

/** The width of each text as the graph draws a node label (the page's body font at the node font size), by text. */
export const measuredWidthsOf = async (page: Page, texts: string[]): Promise<Map<string, number>> => {
  const input: MeasureInput = { texts, fontSize: NODE_FONT_SIZE };
  const widths = await page.evaluate(textWidthsOf, input);
  const entries = texts.map((text, index): [string, number] => [text, widths[index] ?? Number.NaN]);

  return new Map(entries);
};
