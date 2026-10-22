import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { CLOSE_DETAILS_LABEL } from '../../src/graph/common/details.const.ts';
import { DETAILS_LABEL, GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { DETAILS_WIDTH_PX } from '../common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { anchorBoxOf, isClearOf, setViewportWidth } from '../test/utils/graph-narrow.spec.util.ts';
import { hasSideScroll, isDocked, isOverlaid, readBodyRight } from '../test/utils/graph-overlay.spec.util.ts';

/** The details panel in a narrow editor: the viewport width, the overlay and docked layouts, and Close details. */
export class GraphNarrow {
  public readonly closeButton: Locator;
  public readonly container: Locator;
  public readonly document: Locator;
  public readonly panel: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.document = page.locator('html');
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
    this.closeButton = this.panel.getByRole('button', { name: CLOSE_DETAILS_LABEL, exact: true });
  }

  /** Resizes the viewport to `px` wide, keeping its height. */
  public async setWidth(px: number): Promise<void> {
    await setViewportWidth(this.page, px);
  }

  public async closeDetails(): Promise<void> {
    await this.closeButton.click();
  }

  /** The panel is 280 px wide, flush with the body's right edge and starts left of the canvas's right edge. */
  public async expectOverlay(): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.measuresOverlay()).toBe(true);
  }

  /** The panel is 280 px wide and the canvas ends at or left of where it starts. */
  public async expectDocked(): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.measuresDocked()).toBe(true);
  }

  public async expectCloseButton(isShown: boolean): Promise<void> {
    await expect(this.closeButton).toBeVisible({ visible: isShown });
  }

  /** The named nodes' rendered span ends left of the panel with the keep-clear margin to spare. */
  public async expectAnchorsClear(names: string[]): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.measuresClear(names)).toBe(true);
  }

  /** Neither the document nor the panel scrolls sideways, and the panel keeps its 280 px. */
  public async expectNoHorizontalScroll(): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.document.evaluate(hasSideScroll)).toBe(false);
    await expect.poll(async (): Promise<boolean> => this.panel.evaluate(hasSideScroll)).toBe(false);
    await expect.poll(async (): Promise<number> => this.panelWidth()).toBeCloseTo(DETAILS_WIDTH_PX, 0);
  }

  private async panelWidth(): Promise<number> {
    const rect = await this.panel.evaluate(readRect);

    return rect.width;
  }

  private async measuresOverlay(): Promise<boolean> {
    const aside = await this.panel.evaluate(readRect);
    const container = await this.container.evaluate(readRect);
    const bodyRight = await this.page.evaluate(readBodyRight);

    return isOverlaid(aside, container, bodyRight);
  }

  private async measuresDocked(): Promise<boolean> {
    const aside = await this.panel.evaluate(readRect);
    const container = await this.container.evaluate(readRect);

    return isDocked(aside, container);
  }

  private async measuresClear(names: string[]): Promise<boolean> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const aside = await this.panel.evaluate(readRect);
    const box = anchorBoxOf(nodes, names, zoom);

    return isClearOf(box, aside.left);
  }
}
