import type { Locator, Page } from '@playwright/test';

import { GraphMenusPage } from './graph-menus.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';

const centreOf = async (target: Locator): Promise<ViewportPoint> => {
  await target.waitFor();

  const box = await target.boundingBox();

  if (box === null) throw new Error('the target has no box');

  const centre: ViewportPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  return centre;
};

/** Real mouse and keyboard input on the widget layer's buttons, titles and menus. */
export class GraphWidgetInput extends GraphMenusPage {
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    super(page);
    this.probe = new GraphProbePage(page);
  }

  /** The viewport point at the centre of the folder's "…". */
  public async ellipsisCentre(folder: string): Promise<ViewportPoint> {
    const centre = await centreOf(this.widgets.ellipsisOf(folder));

    return centre;
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
