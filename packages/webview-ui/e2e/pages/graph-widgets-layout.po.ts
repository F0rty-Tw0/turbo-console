import { expect } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';
import { folderTitleOf } from '../../src/graph/utils/controls-text.util.ts';
import { WIDGET_MIN_BOX_PX } from '../common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { isCutText, rectOf, titleFaultsOf } from '../test/utils/graph-widgets.spec.util.ts';

const MAX_ZOOM_NOTCHES = 60;

const ZOOM_OUT_NOTCH = 100;

const ZOOM_IN_NOTCH = -100;

/** How the header rows follow their boxes through zoom, filters and panels, and what the overlay and a narrow box hide. */
export class GraphWidgetsLayout extends GraphWidgetsPage {
  private rememberedWidth = Number.NaN;

  /** Wheels over the canvas centre: a negative `deltaY` zooms in, a positive one out. */
  public async zoomBy(deltaY: number): Promise<void> {
    await this.canvas.zoomBy(deltaY);
  }

  /** Wheels out one notch at a time, at most 60, until the folder's box is under `px` wide. */
  public async zoomBoxUnder(folder: string, px: number): Promise<void> {
    for (let notch = 0; notch < MAX_ZOOM_NOTCHES; notch += 1) {
      const width = await this.boxWidthOf(folder);

      if (width < px) return;

      await this.canvas.zoomBy(ZOOM_OUT_NOTCH);
    }
  }

  /** Wheels in one notch at a time, at most 60, until the folder's box is `px` wide or more. */
  public async zoomBoxOver(folder: string, px: number): Promise<void> {
    for (let notch = 0; notch < MAX_ZOOM_NOTCHES; notch += 1) {
      const width = await this.boxWidthOf(folder);

      if (width >= px) return;

      await this.canvas.zoomBy(ZOOM_IN_NOTCH);
    }
  }

  /** Moves keyboard focus to the graph container, the Tab stop before the first widget. */
  public async focusContainer(): Promise<void> {
    await this.container.focus();
  }

  public async expectEllipsisFocused(folder: string): Promise<void> {
    await expect(this.ellipsisOf(folder)).toBeFocused();
  }

  public async expectEllipsisShown(folder: string): Promise<void> {
    await expect(this.ellipsisOf(folder)).toBeVisible();
  }

  public async rememberBoxWidth(folder: string): Promise<void> {
    this.rememberedWidth = await this.boxWidthOf(folder);
  }

  /** The folder's box is narrower than when `rememberBoxWidth` read it. */
  public async expectBoxNarrower(folder: string): Promise<void> {
    await expect.poll(async (): Promise<number> => this.boxWidthOf(folder)).toBeLessThan(this.rememberedWidth);
  }

  /** Each folder's chevron and "…" sit on its box. */
  public async expectRowsFollowBoxes(folders: string[]): Promise<void> {
    for (const folder of folders) await this.expectRowFollowsBox(folder);
  }

  /** The box is wide enough for a header, and its chevron and "…" sit on it within a pixel. */
  public async expectRowFollowsBox(folder: string): Promise<void> {
    const width = await this.boxWidthOf(folder);

    expect(width).toBeGreaterThanOrEqual(WIDGET_MIN_BOX_PX);
    await this.expectChevronOnBox(folder);
    await this.expectEllipsisOnBox(folder);
  }

  /** The folder has no shown header button: neither chevron nor "…". */
  public async expectHeaderHidden(folder: string): Promise<void> {
    const title = folderTitleOf(folder);
    const names = [`Collapse ${title}`, `Expand ${title}`, `Actions for folder ${title}`];

    for (const name of names) await expect(this.layer.getByRole('button', { name, exact: true })).toHaveCount(0);
  }

  /** The layer shows some widget, and none of those shown meets the details overlay. */
  public async expectWidgetsHiddenUnderOverlay(): Promise<void> {
    const shown = this.layer.locator('.widget-button:visible');

    await expect(shown.first()).toBeVisible();
    await expect.poll(async (): Promise<number> => this.coveredCount()).toBe(0);
  }

  /** At least one header button is shown, so a timing run pans a layer that draws widgets. */
  public async expectHeaderButtonsShown(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.shownHeaderButtonCount()).toBeGreaterThan(0);
  }

  /** How many header buttons the layer shows. */
  public async shownHeaderButtonCount(): Promise<number> {
    return this.layer.locator('.widget-row .widget-button:visible').count();
  }

  /** The long title is cut with an ellipsis inside its row, keeps its full text in `title`, and the row sits in the box's top band. */
  public async expectTitleEllipsis(folder: string): Promise<void> {
    const title = this.rowOf(folder).locator('.widget-title');

    await expect(title).toHaveAttribute('title', folderTitleOf(folder));
    await expect(title).toHaveCSS('text-overflow', 'ellipsis');
    await expect.poll(async (): Promise<boolean> => title.evaluate(isCutText)).toBe(true);
    await expect.poll(async (): Promise<string[]> => this.titleFaults(folder)).toEqual([]);
  }

  private async boxWidthOf(folder: string): Promise<number> {
    const box = await this.boxOf(folder);

    return box.width;
  }

  private async coveredCount(): Promise<number> {
    const aside = await this.aside.evaluate(readRect);
    const buttons = await this.layer.locator('.widget-button:visible').all();
    const rects = await Promise.all(buttons.map(rectOf));
    const covered = rects.filter((rect): boolean => rect.left + rect.width > aside.left);

    return covered.length;
  }

  private async titleFaults(folder: string): Promise<string[]> {
    const row = this.rowOf(folder);
    const box = await this.boxOf(folder);
    const rowRect = await rectOf(row);
    const titleRect = await rectOf(row.locator('.widget-title'));

    return titleFaultsOf(titleRect, rowRect, box);
  }
}
