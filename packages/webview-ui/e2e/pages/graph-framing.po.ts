import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { insideFlagsOf } from '../test/utils/graph-geometry.spec.util.ts';

/** How the drawn nodes sit against the graph container, for graphs too big for every node to be in view. */
export class GraphFraming {
  private readonly container: Locator;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
  }

  /** At least one drawn node lies wholly inside the container: Fit did not frame an empty corner. */
  public async expectSomeNodeInView(): Promise<void> {
    await expect.poll(async (): Promise<boolean[]> => this.insideFlags()).toContain(true);
  }

  private async insideFlags(): Promise<boolean[]> {
    await this.probe.waitForNodes();

    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.probe.nodes();

    return insideFlagsOf(container, nodes, zoom);
  }
}
