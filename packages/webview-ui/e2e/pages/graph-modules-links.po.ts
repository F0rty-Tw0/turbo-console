import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeEdge } from '../../src/graph/common/graph-probe.type.ts';

/** How a package edge draws, and so every module link: a plain bezier at card depth, over every folder box. */
const PLAIN_LINE = 'bezier auto';

const drawnStyleOf = (edge: ProbeEdge): string => `${edge.curveStyle} ${edge.zCompoundDepth}`;

const isDrawn = (edge: ProbeEdge): boolean => edge.isDrawn;

/** How the drawn module links run: as plain beziers from card to card, like package edges. */
export class GraphModulesLinks {
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.probe = new GraphProbePage(page);
  }

  /** Exactly `count` module links are drawn, every one `curve-style: bezier` at `z-compound-depth: auto`. */
  public async expectEveryLinkPlain(count: number): Promise<void> {
    const plain = Array.from({ length: count }, (): string => PLAIN_LINE);

    await expect.poll(async (): Promise<string[]> => this.drawnStyles()).toStrictEqual(plain);
  }

  private async drawnStyles(): Promise<string[]> {
    const edges = await this.probe.edges();

    return edges.filter(isDrawn).map(drawnStyleOf);
  }
}
