import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import { MODULE_SLOW_TEXT } from '../../src/graph/common/graph-module.const.ts';
import type { ProbeEdge, ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { MODULES_BAR, SHOW_MODULES_LABEL } from '../common/graph-modules.const.ts';
import type { Camera } from '../common/graph.type.ts';

/** This far outside a box's children, in CSS pixels, a tap lands on the box's own title band (spec §7.4). */
const TITLE_INSET_PX = 4;

/** An expand or collapse keeps the toggled folder's centre on screen this close to where it was (spec §7.4). */
const CENTRE_TOLERANCE_PX = 2;

const edgeLineOf = (edge: ProbeEdge): string => `${edge.source}→${edge.target} ${edge.lineStyle}`;

/** Modules mode's page parts: the modules bar with its buttons, View boxes, banner and slow notice, and the drawn modules graph. */
export class GraphModulesPage {
  public readonly bar: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly banner: Locator;
  private readonly slow: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.bar = page.locator(MODULES_BAR);
    this.banner = this.bar.getByRole('status');
    this.slow = this.bar.getByText(MODULE_SLOW_TEXT, { exact: true });
  }

  public async pressBar(label: string): Promise<void> {
    await this.bar.getByRole('button', { name: label, exact: true }).click();
  }

  /** Clicks the one Show modules on screen: the Details panel's, or the toolbar's on a single-package root. */
  public async pressShowModules(): Promise<void> {
    const buttons = this.page.getByRole('button', { name: SHOW_MODULES_LABEL, exact: true });

    await buttons.filter({ visible: true }).click();
  }

  public async setShown(label: string, isChecked: boolean): Promise<void> {
    await this.bar.getByRole('checkbox', { name: label, exact: true }).setChecked(isChecked);
  }

  /**
   * Clicks the drawn box `id` in its title band, never on a child: the probe's compound size is its children's bounds
   * without the padding, so a point just above and inside their top left corner lies on the box's own padding.
   */
  public async tapBoxTitle(id: string): Promise<void> {
    const node = await this.nodeOf(id);
    const zoom = await this.probe.zoom();
    const left = node.renderedX - (node.width * zoom) / 2;
    const top = node.renderedY - (node.height * zoom) / 2;

    await this.page.mouse.click(left + TITLE_INSET_PX, top - TITLE_INSET_PX);
  }

  public async expectIds(ids: string[]): Promise<void> {
    await this.probe.expectNodeIds(ids);
  }

  /** The drawn edges, each `<source>→<target> <line style>`, are exactly `edges`, in any order. */
  public async expectEdges(edges: string[]): Promise<void> {
    const copy = [...edges];
    const sorted = copy.sort();

    await expect.poll(async (): Promise<string[]> => this.edgeLines()).toEqual(sorted);
  }

  public async expectBarText(text: string): Promise<void> {
    await expect(this.bar).toContainText(text);
  }

  /** The banner reads exactly `text`; `null`: no banner shows. */
  public async expectBanner(text: string | null): Promise<void> {
    if (text === null) return expect(this.banner).toBeHidden();

    await expect(this.banner).toHaveText(text);
    await expect(this.banner).toBeVisible();
  }

  public async expectSlow(isShown: boolean): Promise<void> {
    await expect(this.slow).toBeVisible({ visible: isShown });
  }

  public async expectChecked(label: string, isChecked: boolean): Promise<void> {
    await expect(this.bar.getByRole('checkbox', { name: label, exact: true })).toBeChecked({ checked: isChecked });
  }

  public async expectCamera(camera: Camera): Promise<void> {
    await expect.poll(async (): Promise<Camera | null> => this.cameraOrNull()).toEqual(camera);
  }

  /** The drawn node `id` is centred within `CENTRE_TOLERANCE_PX` of `centre`, in page CSS pixels. */
  public async expectCentreAt(id: string, centre: Position): Promise<void> {
    const distance = async (): Promise<number> => {
      const now = await this.renderedCentre(id);

      return Math.hypot(now.x - centre.x, now.y - centre.y);
    };

    await expect.poll(distance).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);
  }

  /** The zoom and pan on screen now; throws before the canvas has a camera. */
  public async camera(): Promise<Camera> {
    const camera = await this.cameraOrNull();

    if (camera === null) throw new Error('graph e2e: the canvas has no camera yet');

    return camera;
  }

  /** The centre of the drawn node `id` in page CSS pixels. */
  public async renderedCentre(id: string): Promise<Position> {
    const node = await this.nodeOf(id);
    const centre: Position = { x: node.renderedX, y: node.renderedY };

    return centre;
  }

  private async cameraOrNull(): Promise<Camera | null> {
    const zoom = await this.probe.zoom();
    const pan = await this.probe.pan();

    if (pan === null) return null;

    const camera: Camera = { zoom, pan };

    return camera;
  }

  private async edgeLines(): Promise<string[]> {
    const edges = await this.probe.edges();
    const lines = edges.map(edgeLineOf);

    return lines.sort();
  }

  private async nodeOf(id: string): Promise<ProbeNode> {
    await this.probe.waitForNodes();

    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: no node ${id} is drawn`);

    return node;
  }
}
