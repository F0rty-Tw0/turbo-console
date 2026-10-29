/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import type { Camera, WidthChange } from '../common/graph.type.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { isInside, pointBoxOf, readRect } from '../test/utils/element-rect.spec.util.ts';
import { isPanNear, isZoomNear } from '../test/utils/graph-camera.spec.util.ts';
import { toggleControlsMeasured } from '../test/utils/graph-controls.spec.util.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';

const CENTRE_TOLERANCE_PX = 3;

const WIDTH_TOLERANCE_PX = 1;

const centreBoxOf = (node: ProbeNode): ElementRect => {
  const centre: ViewportPoint = { x: node.renderedX, y: node.renderedY };

  return pointBoxOf(centre);
};

/** What the camera shows: zoom and pan, which packages are visible, and where the container puts them. */
export class GraphCamera {
  public readonly canvas: Locator;
  public readonly container: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private remembered: Camera | null;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.remembered = null;
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.canvas = this.container.locator('canvas').first();
  }

  /** Remembers zoom and pan as they are now, for the `expect*Unchanged` and `expectCameraMoved` checks. */
  public async rememberCamera(): Promise<void> {
    this.remembered = await this.camera();
  }

  /**
   * Presses the Controls toggle inside one task and returns the canvas width read just before and just after; only
   * a resize the click itself runs shows here, as Cytoscape's own observers wait a 100 ms debounce.
   */
  public async toggleControlsInOneTask(): Promise<WidthChange> {
    return this.canvas.evaluate(toggleControlsMeasured);
  }

  /** Makes the page `px` shorter; the container fills the page height, so the canvas shrinks with it. */
  public async shrinkHeightBy(px: number): Promise<void> {
    const size = this.page.viewportSize();

    if (size === null) throw new Error('graph e2e: the page has no viewport size');

    await this.page.setViewportSize({ width: size.width, height: size.height - px });
  }

  /** Polls until zoom and pan match the remembered camera within GraphLook's tolerances. */
  public async expectCameraUnchanged(): Promise<void> {
    const camera = this.rememberedCamera();

    await expect.poll(async (): Promise<boolean> => this.isCamera(camera)).toBe(true);
  }

  /** Polls until zoom or pan is outside the tolerances around the remembered camera. */
  public async expectCameraMoved(): Promise<void> {
    const camera = this.rememberedCamera();

    await expect.poll(async (): Promise<boolean> => this.isCamera(camera)).toBe(false);
  }

  public async expectZoomUnchanged(): Promise<void> {
    const { zoom } = this.rememberedCamera();
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

  /** The node's rendered centre is within a few pixels of the container's centre. */
  public async expectCentred(id: string): Promise<void> {
    await expect.poll(async (): Promise<number> => this.centreOffset(id)).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);
  }

  public async expectContainerWidth(px: number): Promise<void> {
    const isWidth = async (): Promise<boolean> => {
      const width = await this.containerWidth();

      return Math.abs(width - px) <= WIDTH_TOLERANCE_PX;
    };

    await expect.poll(isWidth).toBe(true);
  }

  /** The drawn width: the first canvas layer, which Cytoscape sizes on `resize`; the container's own box follows CSS alone. */
  private async containerWidth(): Promise<number> {
    const rect = await this.canvas.evaluate(readRect);

    return rect.width;
  }

  private async camera(): Promise<Camera> {
    const zoom = await this.probe.zoom();
    const pan = await this.probe.pan();

    if (pan === null) throw new Error('graph e2e: the probe reports no pan');

    const camera: Camera = { zoom, pan };

    return camera;
  }

  private rememberedCamera(): Camera {
    if (this.remembered === null) throw new Error('graph e2e: rememberCamera must run first');

    return this.remembered;
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
