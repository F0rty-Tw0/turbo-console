import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { GraphFoldersPage } from './graph-folders.po.ts';
import { GraphMenusPage } from './graph-menus.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import { CLEAR_FOCUS_LABEL, FOCUS_FOLDER_LABEL } from '../../src/graph/common/details.const.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { endCentreOf, linkPointAtY } from '../test/utils/graph-folder-points.spec.util.ts';
import { focusFolderNameOf, isHitAtCentre, isHitWithin } from '../test/utils/graph-widgets.spec.util.ts';

/** How far below a header row's bottom edge a tap lands: clear of the row, still inside its box. */
const BELOW_ROW_PX = 3;

const centreOf = async (target: Locator): Promise<ViewportPoint> => {
  await target.waitFor();

  const box = await target.boundingBox();

  if (box === null) throw new Error('the target has no box');

  const centre: ViewportPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  return centre;
};

/** Real mouse and keyboard input on the widget layer's buttons, titles and menus. */
export class GraphWidgetInput extends GraphMenusPage {
  private readonly foldersPage: GraphFoldersPage;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    super(page);
    this.foldersPage = new GraphFoldersPage(page);
    this.probe = new GraphProbePage(page);
  }

  /** The viewport point at the centre of the folder's "…". */
  public async ellipsisCentre(folder: string): Promise<ViewportPoint> {
    const centre = await centreOf(this.widgets.ellipsisOf(folder));

    return centre;
  }

  /** The folder row's title button. */
  public titleOf(folder: string): Locator {
    return this.widgets.rowOf(folder).locator('.widget-title');
  }

  public async clickTitle(folder: string): Promise<void> {
    await this.titleOf(folder).click();
  }

  /** A real double click: two trusted clicks, the second with `detail` 2. */
  public async dblclickTitle(folder: string): Promise<void> {
    await this.titleOf(folder).dblclick();
  }

  /** Focuses the title, then presses Enter twice with the keyboard; no pointer is involved. */
  public async pressEnterTwiceOnTitle(folder: string): Promise<void> {
    await this.titleOf(folder).focus();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.press('Enter');
  }

  /** The topmost element at the title's centre is the title, so a pointer reaches it. */
  public async expectTitleHit(folder: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.titleOf(folder).evaluate(isHitAtCentre)).toBe(true);
  }

  /** The folder row's Focus folder button, found inside the widget layer so the Controls header's is not matched; `includeHidden` also matches it while hidden. */
  public focusFolderOf(folder: string, includeHidden = false): Locator {
    const name = focusFolderNameOf(folder);

    return this.widgets.layer.getByRole('button', { name, exact: true, includeHidden });
  }

  public async expectFocusFolderFocused(folder: string): Promise<void> {
    await expect(this.focusFolderOf(folder)).toBeFocused();
  }

  public async clickFocusFolder(folder: string): Promise<void> {
    await this.focusFolderOf(folder).click();
  }

  /** Focuses the button, then presses Space with the keyboard; no pointer is involved. */
  public async pressSpaceOnFocusFolder(folder: string): Promise<void> {
    await this.focusFolderOf(folder).focus();
    await this.page.keyboard.press('Space');
  }

  /** The button is pressed and titled `Clear focus`, or unpressed and titled `Focus folder`. */
  public async expectFocusFolderPressed(folder: string, isPressed: boolean): Promise<void> {
    const title = isPressed ? CLEAR_FOCUS_LABEL : FOCUS_FOLDER_LABEL;

    await expect(this.focusFolderOf(folder)).toHaveAttribute('aria-pressed', String(isPressed));
    await expect(this.focusFolderOf(folder)).toHaveAttribute('title', title);
  }

  /** The folder's Focus folder paints `color` as one flat layer over the opaque `base` background colour. */
  public async expectFocusFolderFill(folder: string, color: string, base: string): Promise<void> {
    await expect(this.focusFolderOf(folder)).toHaveCSS('background-image', `linear-gradient(${color}, ${color})`);
    await expect(this.focusFolderOf(folder)).toHaveCSS('background-color', base);
  }

  /** The row has a Focus folder button, and it is hidden. */
  public async expectFocusFolderHidden(folder: string): Promise<void> {
    const button = this.focusFolderOf(folder, true);

    await expect(button).toHaveCount(1);
    await expect(button).toBeHidden();
  }

  public async expectTitleFocused(folder: string): Promise<void> {
    await expect(this.titleOf(folder)).toBeFocused();
  }

  /** Taps the link between two ends, `BELOW_ROW_PX` under the bottom of the folder's header row: over its box, clear of its widgets. */
  public async tapLinkBelowRow(source: string, target: string, folder: string): Promise<void> {
    const row = await this.widgets.rowOf(folder).boundingBox();

    if (row === null) throw new Error(`the ${folder} header row has no box`);

    const folders = await this.foldersPage.folders();
    const nodes = await this.probe.nodes();
    const from = endCentreOf(source, folders, nodes);
    const to = endCentreOf(target, folders, nodes);
    const point = linkPointAtY(from, to, row.y + row.height + BELOW_ROW_PX);
    const isOnCanvas = await this.container.evaluate(isHitWithin, point);

    expect(isOnCanvas, `the tap point (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) lies on a widget, not on the canvas`).toBe(true);
    await this.page.mouse.click(point.x, point.y);
  }

  /** Moves the real mouse to the centre of `target`, then turns its wheel by `deltaY`. */
  public async wheelOver(target: Locator, deltaY: number): Promise<void> {
    const centre = await centreOf(target);

    await this.page.mouse.move(centre.x, centre.y);
    await this.page.mouse.wheel(0, deltaY);
  }

  public async wheelOverEllipsis(folder: string, deltaY: number): Promise<void> {
    await this.wheelOver(this.widgets.ellipsisOf(folder), deltaY);
  }

  /** Wheels over the first item of the open menu. */
  public async wheelOverMenu(deltaY: number): Promise<void> {
    await this.wheelOver(this.menu.locator('.widget-menu-item').first(), deltaY);
  }

  /** The model point under a viewport point at the current camera. */
  public async modelPointUnder(point: ViewportPoint): Promise<Position> {
    const zoom = await this.probe.zoom();
    const pan = await this.probe.pan();
    const box = await this.container.boundingBox();

    if (pan === null || box === null) throw new Error('the graph is not drawn');

    const model: Position = { x: (point.x - box.x - pan.x) / zoom, y: (point.y - box.y - pan.y) / zoom };

    return model;
  }
}
