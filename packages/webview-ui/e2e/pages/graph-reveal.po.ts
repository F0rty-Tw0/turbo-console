import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { DETAILS_LABEL, GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { isInside, readRect } from '../test/utils/element-rect.spec.util.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { anchorBoxOf, isClearOf } from '../test/utils/graph-narrow.spec.util.ts';

const ZOOM_DIGITS = 3;

/** Where a package the host revealed lands: the camera's zoom and the node's box against the canvas and the details panel. */
export class GraphReveal {
  public readonly container: Locator;
  public readonly panel: Locator;

  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
  }

  /** Polls until the zoom is at least `min`. */
  public async expectZoomAtLeast(min: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.probe.zoom()).toBeGreaterThanOrEqual(min);
  }

  /** Polls until the zoom is `zoom`, to three decimals. */
  public async expectZoom(zoom: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.probe.zoom()).toBeCloseTo(zoom, ZOOM_DIGITS);
  }

  /** The zoom right now is under `max`. */
  public async expectZoomBelow(max: number): Promise<void> {
    const zoom = await this.probe.zoom();

    expect(zoom).toBeLessThan(max);
  }

  /** Polls until node `id`'s rendered box lies wholly inside the canvas and ends left of the details panel with the keep-clear margin. */
  public async expectPlaced(id: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isPlaced(id)).toBe(true);
  }

  private async isPlaced(id: string): Promise<boolean> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) return false;

    const zoom = await this.probe.zoom();
    const container = await this.container.evaluate(readRect);
    const aside = await this.panel.evaluate(readRect);
    const isInCanvas = isInside(nodeBoxOf(node, zoom), container);
    const isClear = isClearOf(anchorBoxOf(nodes, [id], zoom), aside.left);

    return isInCanvas && isClear;
  }
}
