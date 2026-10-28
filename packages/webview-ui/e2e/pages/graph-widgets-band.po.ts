import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphWidgetsLayout } from './graph-widgets-layout.po.ts';
import { folderFocusLabelOf, folderTitleOf } from '../../src/graph/utils/controls-text.util.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { isInside, overlaps } from '../test/utils/element-rect.spec.util.ts';
import { collapsedLabelIn } from '../test/utils/graph-collapsed-label.spec.util.ts';
import { folderKeyed } from '../test/utils/graph-folders.spec.util.ts';
import { bandFaultsOf } from '../test/utils/graph-widget-band.spec.util.ts';
import { isCutText, isHitAtCentre, rectOf } from '../test/utils/graph-widgets.spec.util.ts';

/** How far inside a node's top-left corner `tapNodeCorner` clicks, in CSS px. */
const CORNER_INSET_PX = 2;

const MAX_ZOOM_NOTCHES = 60;

const ZOOM_IN_NOTCH = -100;

/** Resolves after two frames. */
const NEXT_FRAME = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

/** Runs in the page through `evaluate`: the element's layout width, untouched by the row's scale transform. */
const layoutWidthOf = (element: HTMLElement): number => element.offsetWidth;

/** The rects of every element `rows` matches. */
const rectsOf = async (rows: Locator): Promise<ElementRect[]> => {
  const all = await rows.all();
  const reads = all.map(rectOf);
  const rects = await Promise.all(reads);

  return rects;
};

/** How many of `others` the rect overlaps. */
const overlapCountOf = (rect: ElementRect, others: ElementRect[]): number => {
  const clashes = others.filter((other): boolean => overlaps(rect, other));

  return clashes.length;
};

/** How many pairs of `rects` overlap. */
const clashCountOf = (rects: ElementRect[]): number => {
  let count = 0;

  for (const [index, rect] of rects.entries()) count += overlapCountOf(rect, rects.slice(index + 1));

  return count;
};

/** How the header rows fit the box band as the camera zooms, and what a collapsed node shows with and without its row. */
export class GraphWidgetsBand extends GraphWidgetsLayout {
  /** Wheels in one notch at a time, at most 60, until some header button shows. */
  public async zoomUntilRowsShown(): Promise<void> {
    for (let notch = 0; notch < MAX_ZOOM_NOTCHES; notch += 1) {
      const shown = await this.shownHeaderButtonCount();

      if (shown > 0) return;

      await this.zoomBy(ZOOM_IN_NOTCH);
    }
  }

  /** Clicks 2 px inside the package's drawn top-left corner. */
  public async tapNodeCorner(name: string): Promise<void> {
    const node = await this.nodeRectOf(name);

    await this.page.mouse.click(node.left + CORNER_INSET_PX, node.top + CORNER_INSET_PX);
  }

  /** The box's chevron and "…" both show and lie inside its top band as drawn at the camera zoom. */
  public async expectRowInBand(folder: string): Promise<void> {
    await expect(this.chevronOf(folder, true)).toBeVisible();
    await expect(this.ellipsisOf(folder)).toBeVisible();
    await expect.poll(async (): Promise<string[]> => this.bandFaults(folder)).toEqual([]);
  }

  /** The box's chevron top sits at least `px · zoom` below the box top. */
  public async expectChevronBelowTop(folder: string, px: number): Promise<void> {
    const zoom = await this.probe.zoom();

    await expect.poll(async (): Promise<number> => this.chevronDrop(folder)).toBeGreaterThanOrEqual(px * zoom);
  }

  /** Two frames on, so the pass a repaint queued has run, the folder still has no shown header button. */
  public async expectHeaderStaysHidden(folder: string): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);
    await this.expectHeaderHidden(folder);
  }

  /** `count` header rows show, and no two of them overlap. */
  public async expectRowsApart(count: number): Promise<void> {
    const rows = this.layer.locator('.widget-row:visible');

    await expect(rows).toHaveCount(count);
    await expect.poll(async (): Promise<number> => clashCountOf(await rectsOf(rows))).toBe(0);
  }

  /** The collapsed row's title and count badge show, and its chevron and "…" overlap neither. */
  public async expectButtonsClearOfHeader(folder: string): Promise<void> {
    await expect(this.rowOf(folder).locator('.widget-title')).toBeVisible();
    await expect(this.badgeOf(folder)).toBeVisible();
    await expect.poll(async (): Promise<number> => this.headerClashCount(folder)).toBe(0);
  }

  /** The canvas draws the collapsed folder's label, as `collapsedLabelOf` cuts its title, over its `count` packages. */
  public async expectCanvasLabel(folder: string, count: number): Promise<void> {
    const label = await collapsedLabelIn(this.page, folderTitleOf(folder), count);

    await expect.poll(async (): Promise<string> => this.canvasLabelOf(folder)).toBe(label);
  }

  /** The canvas draws no label on the collapsed folder. */
  public async expectNoCanvasLabel(folder: string): Promise<void> {
    await expect.poll(async (): Promise<string> => this.canvasLabelOf(folder)).toBe('');
  }

  /** The collapsed node's row shows the folder glyph, the whole folder title with that title as its tooltip, and a whole badge. */
  public async expectCollapsedHeader(folder: string): Promise<void> {
    const title = this.rowOf(folder).locator('.widget-title');

    await this.expectGlyphShown(folder, true);
    await expect(title).toHaveText(folderTitleOf(folder));
    await expect(title).toHaveAttribute('title', folderTitleOf(folder));
    await this.expectBadgeWhole(folder);
  }

  /** The folder glyph shows when `shown`, else it is hidden. */
  public async expectGlyphShown(folder: string, shown: boolean): Promise<void> {
    const glyph = this.rowOf(folder).locator('.widget-glyph');

    await expect(glyph).toBeVisible({ visible: shown });
  }

  /** The count badge is not cut and lies inside the folder's row. */
  public async expectBadgeWhole(folder: string): Promise<void> {
    const badge = this.badgeOf(folder);

    await expect(badge).toBeVisible();
    await expect.poll(async (): Promise<boolean> => badge.evaluate(isCutText)).toBe(false);
    await expect.poll(async (): Promise<boolean> => this.isBadgeInRow(folder)).toBe(true);
  }

  /** A pointer at the badge's centre reaches the badge, which its tooltip needs. */
  public async expectBadgeHittable(folder: string): Promise<void> {
    const badge = this.badgeOf(folder);

    await expect.poll(async (): Promise<boolean> => badge.evaluate(isHitAtCentre)).toBe(true);
  }

  /** The folder's row width in CSS px, as laid out (the box width times the zoom, less the 16 px of insets), is `min` to `max`. */
  public async expectRowWidthIn(folder: string, min: number, max: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.rowWidthOf(folder)).toBeGreaterThanOrEqual(min);
    await expect.poll(async (): Promise<number> => this.rowWidthOf(folder)).toBeLessThanOrEqual(max);
  }

  /** The folder's row width in CSS px, as laid out. */
  private async rowWidthOf(folder: string): Promise<number> {
    return this.rowOf(folder).evaluate(layoutWidthOf);
  }

  private badgeOf(folder: string): Locator {
    return this.rowOf(folder).locator('.widget-count');
  }

  private async isBadgeInRow(folder: string): Promise<boolean> {
    const badge = await rectOf(this.badgeOf(folder));
    const row = await rectOf(this.rowOf(folder));

    return isInside(badge, row);
  }

  /** The folder row's chevron, its Focus folder while shown, and its "…", left to right. */
  private async buttonsOf(folder: string, isExpanded: boolean): Promise<ElementRect[]> {
    const chevron = await rectOf(this.chevronOf(folder, isExpanded));
    const focus = await rectsOf(this.focusFolderIn(folder));
    const ellipsis = await rectOf(this.ellipsisOf(folder));

    return [chevron, ...focus, ellipsis];
  }

  /** Matches the row's Focus folder button only while it is shown: the role query leaves hidden elements out. */
  private focusFolderIn(folder: string): Locator {
    const name = folderFocusLabelOf(folderTitleOf(folder));

    return this.rowOf(folder).getByRole('button', { name, exact: true });
  }

  private async bandFaults(folder: string): Promise<string[]> {
    const box = await this.boxOf(folder);
    const buttons = await this.buttonsOf(folder, true);
    const zoom = await this.probe.zoom();

    return bandFaultsOf(box, buttons, zoom);
  }

  /** How many of the collapsed row's button and header part pairs overlap. */
  private async headerClashCount(folder: string): Promise<number> {
    const row = this.rowOf(folder);
    const buttons = await this.buttonsOf(folder, false);
    const title = await rectOf(row.locator('.widget-title'));
    const badge = await rectOf(this.badgeOf(folder));
    const parts = [title, badge];
    let count = 0;

    for (const button of buttons) count += overlapCountOf(button, parts);

    return count;
  }

  private async canvasLabelOf(folder: string): Promise<string> {
    const folders = await this.folders.folders();

    return folderKeyed(folders, folder).text;
  }

  private async chevronDrop(folder: string): Promise<number> {
    const box = await this.boxOf(folder);
    const chevron = await rectOf(this.chevronOf(folder, true));

    return chevron.top - box.top;
  }
}
