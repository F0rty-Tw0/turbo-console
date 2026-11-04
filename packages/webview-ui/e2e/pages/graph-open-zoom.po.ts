import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphCamera } from './graph-camera.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphPage } from './graph.po.ts';
import { OPEN_ZOOM_FLOOR } from '../../src/graph/common/graph-layout.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';

const ANCHOR_TOLERANCE_PX = 3;

const ZOOM_DIGITS = 6;

const topOf = (zoom: number) => {
  return (node: ProbeNode): number => node.renderedY - (node.height * zoom) / 2;
};

const leftOf = (zoom: number) => {
  return (node: ProbeNode): number => node.renderedX - (node.width * zoom) / 2;
};

const rightOf = (zoom: number) => {
  return (node: ProbeNode): number => node.renderedX + (node.width * zoom) / 2;
};

/** What the camera does at open: the floored zoom, its top-centre anchor, and Fit still fitting. */
export class GraphOpenZoom {
  private readonly camera: GraphCamera;
  private readonly graph: GraphPage;
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.camera = new GraphCamera(page);
    this.graph = new GraphPage(page);
    this.probe = new GraphProbePage(page);
  }

  /** Sets the page size before it opens, so a fixture that fits big at 1280 x 720 fits small here. */
  public async resizeTo(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  public async expectZoom(zoom: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.probe.zoom()).toBeCloseTo(zoom, ZOOM_DIGITS);
  }

  /** The zoom is a true fit: above zero and under the opening floor. */
  public async expectZoomBelowFloor(): Promise<void> {
    const zoom = async (): Promise<boolean> => {
      const now = await this.probe.zoom();

      return now > 0 && now < OPEN_ZOOM_FLOOR;
    };

    await expect.poll(zoom).toBe(true);
  }

  /** Presses Fit and returns the zoom it lands on. */
  public async fitZoom(): Promise<number> {
    await this.graph.pressButton(FIT_LABEL);
    await this.graph.waitFrames();

    return this.probe.zoom();
  }

  /** The zoom as the page opened it, once its layout has landed, equals the zoom Fit lands on. */
  public async expectOpenedAtFit(): Promise<void> {
    await this.probe.expectLayoutSettled();

    const opened = await this.probe.zoom();
    const fitted = await this.fitZoom();

    expect(opened).toBeCloseTo(fitted, ZOOM_DIGITS);
  }

  /** The packages' hull starts `pad` px below the canvas top and its middle is the canvas middle; for a flat graph, whose hull is its nodes. */
  public async expectTopCentred(pad: number): Promise<void> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const canvas = await this.camera.canvas.evaluate(readRect);
    const tops = nodes.map(topOf(zoom));
    const lefts = nodes.map(leftOf(zoom));
    const rights = nodes.map(rightOf(zoom));
    const top = Math.min(...tops) - canvas.top;
    const middle = (Math.min(...lefts) + Math.max(...rights)) / 2 - canvas.left;

    expect(Math.abs(top - pad)).toBeLessThanOrEqual(ANCHOR_TOLERANCE_PX);
    expect(Math.abs(middle - canvas.width / 2)).toBeLessThanOrEqual(ANCHOR_TOLERANCE_PX);
  }
}
