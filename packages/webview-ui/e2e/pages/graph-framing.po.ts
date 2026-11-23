import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { insideFlagsOf } from '../test/utils/graph-geometry.spec.util.ts';

/**
 * One read after a Fit of a 10k graph waits out the first frame that draws every element (1.7 s flat, 2.7 + 4.5 s for
 * the tasks) and serializes 10k probe nodes (2.7 s), so the default 5 s poll ends before its first read returns.
 */
const FRAMING_POLL_MS = 30_000;

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
    await expect.poll(async (): Promise<boolean[]> => this.insideFlags(), { timeout: FRAMING_POLL_MS }).toContain(true);
  }

  private async insideFlags(): Promise<boolean[]> {
    await this.probe.waitForNodes();

    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.probe.nodes();

    return insideFlagsOf(container, nodes, zoom);
  }
}
