import { expect } from '@playwright/test';

import { GraphWidgetsLayout } from './graph-widgets-layout.po.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { isInside } from '../test/utils/element-rect.spec.util.ts';
import { bandFaultsOf, labelFaultsOf } from '../test/utils/graph-widget-band.spec.util.ts';
import { isCutText, rectOf } from '../test/utils/graph-widgets.spec.util.ts';

/** How far inside a node's top-left corner `tapNodeCorner` clicks, in CSS px. */
const CORNER_INSET_PX = 2;

const MAX_ZOOM_NOTCHES = 60;

const ZOOM_IN_NOTCH = -100;

/** Resolves after two frames. */
const NEXT_FRAME = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

/** Runs in the page through `evaluate`: the element's layout width, untouched by the row's scale transform. */
const layoutWidthOf = (element: HTMLElement): number => element.offsetWidth;

/** How the header rows fit the box band as the camera zooms, and stay clear of a collapsed node's title. */
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

  /** The collapsed node's chevron and "…" lie left and right of the widest title it can draw. */
  public async expectCollapsedClearOfLabel(folder: string): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.labelFaults(folder)).toEqual([]);
  }

  /** The folder glyph shows when `shown`, else it is hidden. */
  public async expectGlyphShown(folder: string, shown: boolean): Promise<void> {
    const glyph = this.rowOf(folder).locator('.widget-glyph');

    if (shown) await expect(glyph).toBeVisible();
    else await expect(glyph).toBeHidden();
  }

  /** The count badge is not cut and lies inside the folder's row. */
  public async expectBadgeWhole(folder: string): Promise<void> {
    const badge = this.rowOf(folder).locator('.widget-count');

    await expect(badge).toBeVisible();
    await expect.poll(async (): Promise<boolean> => badge.evaluate(isCutText)).toBe(false);
    await expect.poll(async (): Promise<boolean> => this.isBadgeInRow(folder)).toBe(true);
  }

  /** The folder's row width in CSS px, as laid out (the box width times the zoom, less the 16 px of insets), is `min` to `max`. */
  public async expectRowWidthIn(folder: string, min: number, max: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.rowWidthOf(folder)).toBeGreaterThanOrEqual(min);
    await expect.poll(async (): Promise<number> => this.rowWidthOf(folder)).toBeLessThanOrEqual(max);
  }

  /** The folder's row width in CSS px, as laid out. */
  public async rowWidthOf(folder: string): Promise<number> {
    return this.rowOf(folder).evaluate(layoutWidthOf);
  }

  private async isBadgeInRow(folder: string): Promise<boolean> {
    const badge = await rectOf(this.rowOf(folder).locator('.widget-count'));
    const row = await rectOf(this.rowOf(folder));

    return isInside(badge, row);
  }

  private async buttonsOf(folder: string, isExpanded: boolean): Promise<ElementRect[]> {
    const chevron = await rectOf(this.chevronOf(folder, isExpanded));
    const ellipsis = await rectOf(this.ellipsisOf(folder));

    return [chevron, ellipsis];
  }

  private async bandFaults(folder: string): Promise<string[]> {
    const box = await this.boxOf(folder);
    const buttons = await this.buttonsOf(folder, true);
    const zoom = await this.probe.zoom();

    return bandFaultsOf(box, buttons, zoom);
  }

  private async labelFaults(folder: string): Promise<string[]> {
    const node = await this.boxOf(folder);
    const buttons = await this.buttonsOf(folder, false);
    const zoom = await this.probe.zoom();

    return labelFaultsOf(node, buttons, zoom);
  }

  private async chevronDrop(folder: string): Promise<number> {
    const box = await this.boxOf(folder);
    const chevron = await rectOf(this.chevronOf(folder, true));

    return chevron.top - box.top;
  }
}
