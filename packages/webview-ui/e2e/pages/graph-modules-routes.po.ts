import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeEdge, ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { readEdgeLines, throughNodeCountOf } from '../test/utils/graph-lines.spec.util.ts';

const ROUTED_CURVE = 'round-segments';

/** A line that only grazes a card's frame is not through it: the cards are read this far inside their border. */
const CARD_INSET_PX = 1;

const curveStyleOf = (edge: ProbeEdge): string => edge.curveStyle;

/** How the drawn module links run: on their ELK routes, and around the cards they do not join. */
export class GraphModulesRoutes {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /** Exactly `count` module links are drawn, every one on its ELK route (`curve-style: round-segments`). */
  public async expectEveryLinkRouted(count: number): Promise<void> {
    const routed = Array.from({ length: count }, (): string => ROUTED_CURVE);

    await expect.poll(async (): Promise<string[]> => this.curveStyles()).toStrictEqual(routed);
  }

  /** No drawn link crosses a card that is neither of its ends; `boxIds` are the expanded folders, which links enter. */
  public async expectNoLinkThroughCards(boxIds: string[]): Promise<void> {
    await expect.poll(async (): Promise<number> => this.throughCardCount(boxIds)).toBe(0);
  }

  private async curveStyles(): Promise<string[]> {
    const edges = await this.probe.edges();

    return edges.map(curveStyleOf);
  }

  private async throughCardCount(boxIds: string[]): Promise<number> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const lines = await readEdgeLines(this.page);
    const isCard = (node: ProbeNode): boolean => !boxIds.includes(node.id);
    const cards = nodes.filter(isCard);

    return throughNodeCountOf(lines, cards, zoom, CARD_INSET_PX);
  }
}
