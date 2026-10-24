import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphFoldersPage } from './graph-folders.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { DETAILS_LABEL, GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { folderTitleOf } from '../../src/graph/utils/controls-text.util.ts';
import type { RowFrame } from '../common/graph-folders.type.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { boxRectOf, folderKeyed } from '../test/utils/graph-folders.spec.util.ts';
import {
  boxRowFrameOf,
  chevronFaultsOf,
  collapsedRowFrameOf,
  cornerFaultsOf,
  ellipsisFaultsOf,
  ellipsisNameOf,
  isNextSiblingOf,
  layerFaultsOf,
  nodeRectNamed,
  rectOf
} from '../test/utils/graph-widgets.spec.util.ts';

/** Where a box or collapsed node's row buttons sit at a camera zoom. */
type RowFrameOf = (zoom: number) => RowFrame;

/** Where `panIntoOverlayMargin` leaves a node's right edge: inside the 16 px keep-clear margin left of the overlay. */
const MARGIN_GAP_PX = 8;

/** The keep-clear margin left of the overlay, less a pixel of rounding. */
const CLEAR_MARGIN_PX = 15;

/** The widget layer over the canvas: folder header rows, collapsed-node buttons and the selected package's "…". */
export class GraphWidgetsPage {
  public readonly layer: Locator;

  protected readonly aside: Locator;
  protected readonly canvas: GraphCanvas;
  protected readonly container: Locator;
  protected readonly flow: Locator;
  protected readonly folders: GraphFoldersPage;
  protected readonly page: Page;
  protected readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.canvas = new GraphCanvas(page);
    this.folders = new GraphFoldersPage(page);
    this.probe = new GraphProbePage(page);
    this.layer = page.locator('.graph-widgets');
    this.flow = page.locator('.graph-flow');
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.aside = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
  }

  public rowOf(folder: string): Locator {
    const ellipsis = this.page.getByRole('button', { name: ellipsisNameOf(folder), exact: true });

    return this.layer.locator('.widget-row').filter({ has: ellipsis });
  }

  public chevronOf(folder: string, isExpanded: boolean): Locator {
    const verb = isExpanded ? 'Collapse' : 'Expand';

    return this.layer.getByRole('button', { name: `${verb} ${folderTitleOf(folder)}`, exact: true });
  }

  public ellipsisOf(folder: string): Locator {
    return this.layer.getByRole('button', { name: ellipsisNameOf(folder), exact: true });
  }

  public packageButton(name: string): Locator {
    return this.layer.getByRole('button', { name: `Actions for ${name}`, exact: true });
  }

  /** Pans the canvas so the package's right edge sits inside the keep-clear margin left of the open overlay. */
  public async panIntoOverlayMargin(name: string): Promise<void> {
    const node = await this.nodeRectOf(name);
    const aside = await this.aside.evaluate(readRect);
    const dx = aside.left - MARGIN_GAP_PX - (node.left + node.width);

    await this.canvas.panBy(dx, 0);
  }

  /** The flow overlay is the container's next sibling, the layer is the overlay's, and the layer covers exactly the container's rect. */
  public async expectLayerAfterContainer(): Promise<void> {
    await expect(this.layer).toBeAttached();
    await expect.poll(async (): Promise<boolean> => this.container.evaluate(isNextSiblingOf, 'graph-flow')).toBe(true);
    await expect.poll(async (): Promise<boolean> => this.flow.evaluate(isNextSiblingOf, 'graph-widgets')).toBe(true);
    await expect.poll(async (): Promise<string[]> => layerFaultsOf(this.layer, this.container)).toEqual([]);
  }

  /** A box row: an expanded chevron, the full title in its text and `title` attribute, and the package count. */
  public async expectBoxRow(folder: string, count: string): Promise<void> {
    const title = folderTitleOf(folder);
    const row = this.rowOf(folder);

    await expect(this.chevronOf(folder, true)).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('.widget-title')).toHaveText(title);
    await expect(row.locator('.widget-title')).toHaveAttribute('title', title);
    await expect(row.locator('.widget-count')).toHaveText(count);
  }

  /** The chevron sits 8 px in from the box's left edge, centred in the band at the box's top. */
  public async expectChevronOnBox(folder: string): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.chevronFaults(folder, true, boxRowFrameOf)).toEqual([]);
  }

  /** The "…" ends 8 px in from the box's right edge, level with the chevron. */
  public async expectEllipsisOnBox(folder: string): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.ellipsisFaults(folder, boxRowFrameOf)).toEqual([]);
  }

  /** A collapsed node's row: an Expand chevron and the "…" in its top corners, 8 px in at the row's scale, and no title. */
  public async expectCollapsedRow(folder: string): Promise<void> {
    await expect(this.chevronOf(folder, false)).toHaveAttribute('aria-expanded', 'false');
    await expect(this.rowOf(folder).locator('.widget-title')).toHaveCount(0);
    await expect.poll(async (): Promise<string[]> => this.chevronFaults(folder, false, collapsedRowFrameOf)).toEqual([]);
    await expect.poll(async (): Promise<string[]> => this.ellipsisFaults(folder, collapsedRowFrameOf)).toEqual([]);
  }

  /** The chevron has focus, as after a click on the row it replaced. */
  public async expectChevronFocused(folder: string, isExpanded: boolean): Promise<void> {
    await expect(this.chevronOf(folder, isExpanded)).toBeFocused();
  }

  /** Exactly one package "…", centred on the selected package's drawn top-right corner, its border included. */
  public async expectPackageButtonOn(name: string): Promise<void> {
    await expect(this.layer.locator('.widget-package-button')).toHaveCount(1);
    await expect.poll(async (): Promise<string[]> => this.packageButtonFaults(name)).toEqual([]);
  }

  /** The package "…" ends left of the open overlay with the keep-clear margin to spare. */
  public async expectPackageButtonClear(name: string): Promise<void> {
    await expect(this.packageButton(name)).toBeVisible();
    await expect.poll(async (): Promise<number> => this.packageButtonGap(name)).toBeGreaterThanOrEqual(CLEAR_MARGIN_PX);
  }

  public async expectNoPackageButton(): Promise<void> {
    await expect(this.layer.locator('.widget-package-button')).toHaveCount(0);
  }

  public async expectNoRow(folder: string): Promise<void> {
    await expect(this.ellipsisOf(folder)).toHaveCount(0);
  }

  public async expectNoRows(): Promise<void> {
    await expect(this.layer.locator('.widget-row')).toHaveCount(0);
  }

  protected async boxOf(folder: string): Promise<ElementRect> {
    const folders = await this.folders.folders();

    return boxRectOf(folderKeyed(folders, folder));
  }

  protected async nodeRectOf(name: string): Promise<ElementRect> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();

    return nodeRectNamed(nodes, zoom, name);
  }

  private async chevronFaults(folder: string, isExpanded: boolean, frameOf: RowFrameOf): Promise<string[]> {
    const box = await this.boxOf(folder);
    const chevron = await rectOf(this.chevronOf(folder, isExpanded));
    const zoom = await this.probe.zoom();

    return chevronFaultsOf(box, chevron, frameOf(zoom));
  }

  private async ellipsisFaults(folder: string, frameOf: RowFrameOf): Promise<string[]> {
    const box = await this.boxOf(folder);
    const ellipsis = await rectOf(this.ellipsisOf(folder));
    const zoom = await this.probe.zoom();

    return ellipsisFaultsOf(box, ellipsis, frameOf(zoom));
  }

  private async packageButtonFaults(name: string): Promise<string[]> {
    const node = await this.nodeRectOf(name);
    const zoom = await this.probe.zoom();
    const button = await rectOf(this.packageButton(name));

    return cornerFaultsOf(node, button, zoom);
  }

  /** How far left of the overlay's left edge the package "…" ends. */
  private async packageButtonGap(name: string): Promise<number> {
    const button = await rectOf(this.packageButton(name));
    const aside = await this.aside.evaluate(readRect);

    return aside.left - (button.left + button.width);
  }
}
