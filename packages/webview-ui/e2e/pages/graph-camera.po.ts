/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { Camera } from '../common/graph.type.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { isInside, readRect } from '../test/utils/element-rect.spec.util.ts';
import { isPanNear, isZoomNear } from '../test/utils/graph-camera.spec.util.ts';

const CENTRE_TOLERANCE_PX = 3;

const WIDTH_TOLERANCE_PX = 1;

const sortedNames = (names: string[]): string[] => {
  const copy = [...names];

  return copy.sort();
};

const centreBoxOf = (node: ProbeNode): ElementRect => {
  const box: ElementRect = { left: node.renderedX, top: node.renderedY, width: 0, height: 0 };

  return box;
};

/** What the camera shows: zoom and pan, which packages are visible, and where the container puts them. */
export class GraphCamera {
  private readonly canvas: Locator;
  private readonly container: Locator;
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.canvas = this.container.locator('canvas').first();
  }

  public async camera(): Promise<Camera> {
    const zoom = await this.probe.zoom();
    const pan = await this.probe.pan();

    if (pan === null) throw new Error('graph e2e: the probe reports no pan');

    const camera: Camera = { zoom, pan };

    return camera;
  }

  /** The drawn width: the first canvas layer, which Cytoscape sizes on `resize`; the container's own box follows CSS alone. */
  public async containerWidth(): Promise<number> {
    const rect = await this.canvas.evaluate(readRect);

    return rect.width;
  }

  /** Polls until zoom and pan match `camera` within GraphLook's tolerances. */
  public async expectCamera(camera: Camera): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isCamera(camera)).toBe(true);
  }

  /** Polls until zoom or pan is outside the tolerances around `camera`. */
  public async expectCameraNot(camera: Camera): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isCamera(camera)).toBe(false);
  }

  public async expectZoom(zoom: number): Promise<void> {
    const isZoom = async (): Promise<boolean> => {
      const now = await this.probe.zoom();

      return isZoomNear(now, zoom);
    };

    await expect.poll(isZoom).toBe(true);
  }

  public async expectVisible(ids: string[]): Promise<void> {
    const sorted = sortedNames(ids);

    await expect.poll(async (): Promise<string[]> => this.visibleIds()).toEqual(sorted);
  }

  /** Every visible node's rendered centre lies inside the container box. */
  public async expectVisibleInView(): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.visibleOutside()).toEqual([]);
  }

  /** A click at the node's rendered centre selects nothing, once the click has been handled. */
  public async expectUntappable(id: string): Promise<void> {
    const node = await this.nodeOf(id);

    await this.page.mouse.click(node.renderedX, node.renderedY);
    await this.page.evaluate(NEXT_FRAME);
    await this.probe.expectSelected(null);
  }

  /** The node's rendered centre is within a few pixels of the container's centre. */
  public async expectCentred(id: string): Promise<void> {
    await expect.poll(async (): Promise<number> => this.centreOffset(id)).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);
  }

  public async expectContainerWidthAbove(px: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.containerWidth()).toBeGreaterThan(px);
  }

  public async expectContainerWidth(px: number): Promise<void> {
    const isWidth = async (): Promise<boolean> => {
      const width = await this.containerWidth();

      return Math.abs(width - px) <= WIDTH_TOLERANCE_PX;
    };

    await expect.poll(isWidth).toBe(true);
  }

  private async visibleIds(): Promise<string[]> {
    return this.page.evaluate((): string[] => window.__tcGraphProbe?.visibleIds() ?? []);
  }

  private async isCamera(camera: Camera): Promise<boolean> {
    const now = await this.camera();
    const isZoomClose = isZoomNear(now.zoom, camera.zoom);
    const isPanClose = isPanNear(now.pan, camera.pan);

    return isZoomClose && isPanClose;
  }

  private async visibleOutside(): Promise<string[]> {
    const container = await this.container.evaluate(readRect);
    const ids = await this.visibleIds();
    const nodes = await this.probe.nodes();
    const shown = nodes.filter((node): boolean => ids.includes(node.id));
    const outside = shown.filter((node): boolean => !isInside(centreBoxOf(node), container));

    return outside.map((node): string => node.id);
  }

  private async centreOffset(id: string): Promise<number> {
    const container = await this.container.evaluate(readRect);
    const node = await this.nodeOf(id);
    const dx = Math.abs(node.renderedX - (container.left + container.width / 2));
    const dy = Math.abs(node.renderedY - (container.top + container.height / 2));

    return Math.max(dx, dy);
  }

  private async nodeOf(id: string): Promise<ProbeNode> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: no node ${id} is drawn`);

    return node;
  }
}
