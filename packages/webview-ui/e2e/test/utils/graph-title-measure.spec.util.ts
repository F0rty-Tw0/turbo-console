import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PACKAGE_GLYPH } from '../../../src/graph/common/graph-glyph.const.ts';
import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import { NODE_FONT_SIZE } from '../../../src/graph/common/graph.const.ts';

/** What a title check reads of a drawn box, a probe node or folder alike: its title, `text-max-width` and model width. */
type TitleBox = Pick<ProbeNode, 'text' | 'textMaxWidth' | 'width'>;

type MeasureInput = {
  readonly texts: string[];
  readonly fontSize: number;
  readonly glyph: string;
};

/**
 * Runs in the page: the width of each text at `fontSize` px as a canvas measures it, in the codicon font list when the
 * text starts with `glyph` (a package box title, as `main.ts` measures it) and in the page's body font otherwise.
 */
const textWidthsOf = ({ texts, fontSize, glyph }: MeasureInput): number[] => {
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) throw new Error('graph e2e: no 2d canvas context to measure text');

  const bodyFont = getComputedStyle(document.body).fontFamily;
  const widthOf = (text: string): number => {
    context.font = text.startsWith(glyph) ? `${fontSize}px codicon, ${bodyFont}` : `${fontSize}px ${bodyFont}`;

    return context.measureText(text).width;
  };

  return texts.map(widthOf);
};

/** The width of each text as the graph draws a node label (the node font size; the codicon list for a package box title), by text. */
export const measuredWidthsOf = async (page: Page, texts: string[]): Promise<Map<string, number>> => {
  const input: MeasureInput = { texts, fontSize: NODE_FONT_SIZE, glyph: PACKAGE_GLYPH };
  const widths = await page.evaluate(textWidthsOf, input);
  const entries = texts.map((text, index): [string, number] => [text, widths[index] ?? Number.NaN]);

  return new Map(entries);
};

const titleOf = (box: TitleBox): string => box.text;

/**
 * Each of `boxes` may draw its whole title: Cytoscape cuts an ellipsis label unless its rounded-up width is under
 * `text-max-width`, and the box's model width holds the measured title.
 */
export const expectTitlesFit = async (page: Page, boxes: TitleBox[]): Promise<void> => {
  const titles = boxes.map(titleOf);
  const widths = await measuredWidthsOf(page, titles);

  for (const box of boxes) {
    const measured = widths.get(box.text) ?? Number.NaN;

    expect(box.textMaxWidth, box.text).toBeGreaterThan(Math.ceil(measured));
    expect(box.width, box.text).toBeGreaterThanOrEqual(measured);
  }
};
