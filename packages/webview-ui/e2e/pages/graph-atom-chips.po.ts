/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { ProbeRect } from '../../src/graph/common/graph-probe-titles.type.ts';

/** Runs in the page: whether the chip's first child node is its glyph span, which `prepend(glyph)` makes and `append(glyph)` does not. */
const isGlyphFirst = (chip: HTMLElement): boolean => {
  const { firstChild } = chip;

  return firstChild instanceof HTMLElement && firstChild.classList.contains('atom-chip-glyph');
};

/** Runs in the page: the label `id` draws while an export is on, `null` when the page has no probe. */
const exportLabelIn = (id: string): string | null => window.__tcGraphProbe?.exportLabel(id) ?? null;

/** The chip row over each drawn umbrella in the widgets layer, and the label the umbrella draws while it is exported. */
export class GraphAtomChips {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** The text of each chip in the row of `umbrellaId`, in order; `[]` while it has no row. */
  public async texts(umbrellaId: string): Promise<string[]> {
    return this.rowOf(umbrellaId).locator('.atom-chip').allTextContents();
  }

  /** The row of `umbrellaId` shows exactly `texts`, in order. */
  public async expectTexts(umbrellaId: string, texts: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.texts(umbrellaId)).toEqual(texts);
  }

  /** No row is in the DOM for `umbrellaId`. */
  public async expectNoRow(umbrellaId: string): Promise<void> {
    await expect(this.rowOf(umbrellaId)).toHaveCount(0);
  }

  /** Each outlined chip of `umbrellaId` (cached, failed) leads with its glyph span, and the files chip has none. */
  public async expectGlyphsLeadOutlinedChips(umbrellaId: string): Promise<void> {
    const row = this.rowOf(umbrellaId);
    const outlined = row.locator('.atom-chip-cached, .atom-chip-failed');
    const count = await outlined.count();

    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const isFirst = await outlined.nth(index).evaluate(isGlyphFirst);

      expect(isFirst).toBe(true);
    }

    await expect(row.locator('.atom-chip-files .atom-chip-glyph')).toHaveCount(0);
  }

  /** The row of `umbrellaId` as a box in page CSS pixels. */
  public async rectOf(umbrellaId: string): Promise<ProbeRect> {
    const box = await this.rowOf(umbrellaId).boundingBox();

    if (box === null) throw new Error(`no chip row is drawn for ${umbrellaId}`);

    const rect: ProbeRect = { left: box.x, top: box.y, width: box.width, height: box.height };

    return rect;
  }

  /** The label `id` draws while an export is on is `text`. */
  public async expectExportLabel(id: string, text: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.page.evaluate(exportLabelIn, id)).toEqual(text);
  }

  private rowOf(umbrellaId: string): Locator {
    return this.page.locator(`.graph-widgets .atom-chips[data-umbrella="${umbrellaId}"]`);
  }
}
