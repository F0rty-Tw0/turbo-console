import type { Page } from '@playwright/test';

import { NODE_FONT_SIZE } from '../../../src/graph/common/graph.const.ts';

type MeasureInput = {
  readonly text: string;
  readonly fontSize: number;
};

/** Runs in the page: the width of `text` in the page's body font at `fontSize` px, as a canvas measures it. */
const textWidthOf = ({ text, fontSize }: MeasureInput): number => {
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) return 0;

  context.font = `${fontSize}px ${getComputedStyle(document.body).fontFamily}`;

  return context.measureText(text).width;
};

/** The width of `text` as the graph draws a node label: the page's body font at the node font size. */
export const measuredWidthOf = async (page: Page, text: string): Promise<number> => {
  const input: MeasureInput = { text, fontSize: NODE_FONT_SIZE };

  return page.evaluate(textWidthOf, input);
};
