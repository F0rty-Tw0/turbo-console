import type { Locator, Page } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { ONE_FRAME } from '../common/graph.const.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { emptySpotOf } from '../test/utils/graph-geometry.spec.util.ts';

/** The pointer resting on the drawn graph, aimed through the probe's rendered node centres. */
export class GraphHover {
  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly container: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
  }

  /** Moves the pointer onto node `id` and lets a frame draw; the pointer stays there. */
  public async overNode(id: string): Promise<void> {
    const node = await this.nodeOf(id);

    await this.page.mouse.move(node.renderedX, node.renderedY);
    await this.page.evaluate(ONE_FRAME);
  }

  /** Moves the pointer to an empty spot of the canvas, off every node and link, and lets a frame draw. */
  public async overBackground(): Promise<void> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.probe.nodes();
    const edges = await this.probe.edges();
    const spot: ViewportPoint = emptySpotOf(container, nodes, edges, zoom);

    await this.page.mouse.move(spot.x, spot.y);
    await this.page.evaluate(ONE_FRAME);
  }

  private async nodeOf(id: string): Promise<ProbeNode> {
    await this.probe.waitForNodes();

    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: no node ${id} is drawn`);

    return node;
  }
}
