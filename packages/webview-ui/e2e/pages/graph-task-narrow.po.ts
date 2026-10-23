import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { TASK_DETAILS_ID } from '../../src/graph/common/graph-task.const.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { isTopmostAtCentre } from '../test/utils/graph-task-narrow.spec.util.ts';
import { nodeRectNamed, rectOf } from '../test/utils/graph-widgets.spec.util.ts';

/** How far left of the task details panel a task's centre is panned: its centre stays tappable, its right side and "…" go under the panel. */
const INSET_PX = 24;

/** How far left of the canvas's right edge a task's centre is panned in a wide editor, so a narrower one puts it under the overlaid panel. */
const CANVAS_INSET_PX = 60;

/** Task mode in a narrow editor: a task panned under the overlaid task details panel, and what a click on its "…" and menu lands on. */
export class GraphTaskNarrow {
  private readonly page: Page;
  private readonly canvas: GraphCanvas;
  private readonly probe: GraphProbePage;
  private readonly panel: Locator;
  private readonly container: Locator;
  private readonly items: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.canvas = new GraphCanvas(page);
    this.probe = new GraphProbePage(page);
    this.panel = page.locator(`#${TASK_DETAILS_ID}`);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.items = page.getByRole('menu').getByRole('menuitem');
  }

  /** Pans the camera so `id`'s centre sits `INSET_PX` left of the task details panel. */
  public async panUnderPanel(id: string): Promise<void> {
    const panel = await rectOf(this.panel);

    await this.panCentreTo(id, panel.left - INSET_PX);
  }

  /** Pans the camera so `id`'s centre sits `CANVAS_INSET_PX` left of the canvas's right edge. */
  public async panNearCanvasRight(id: string): Promise<void> {
    const canvas = await rectOf(this.container);

    await this.panCentreTo(id, canvas.left + canvas.width - CANVAS_INSET_PX);
  }

  /** A click at the centre of `id`'s "…" lands on the "…", not on the panel. */
  public async expectMenuButtonOnTop(id: string): Promise<void> {
    const button = this.page.getByRole('button', { name: `Actions for ${id}`, exact: true });

    await expect.poll(async (): Promise<boolean> => button.evaluate(isTopmostAtCentre)).toBe(true);
  }

  /** The menu has items, and a click at the centre of each lands on it, not on the panel. */
  public async expectMenuItemsOnTop(): Promise<void> {
    await expect(this.items.first()).toBeVisible();

    const count = await this.items.count();

    for (let index = 0; index < count; index += 1) expect(await this.items.nth(index).evaluate(isTopmostAtCentre)).toBe(true);
  }

  private async panCentreTo(id: string, x: number): Promise<void> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const node = nodeRectNamed(nodes, zoom, id);

    await this.canvas.panBy(x - (node.left + node.width / 2), 0);
  }
}
