import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { PLAIN_LINE } from '../common/graph-plain-lines.const.ts';
import { drawnStyleOf, isDrawn } from '../test/utils/graph-plain-lines.spec.util.ts';

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
