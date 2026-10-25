import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { ATOM_BOX_PADDING_PX, ATOM_BOX_PREFIX } from '../../src/graph/common/graph-atom.const.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';

/** The file nodes and the box of an expanded Atomizer group that is capped, read through the probe. */
export class GraphAtomCap {
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.probe = new GraphProbePage(page);
  }

  /** Of `ids`, exactly `expected` are drawn. */
  public async expectDrawnOf(ids: string[], expected: string[]): Promise<void> {
    const sorted = sortedNames(expected);

    await expect.poll(async (): Promise<string[]> => this.drawnOf(ids)).toEqual(sorted);
  }

  /** The box `atom:<umbrellaId>` is drawn and at least `minWidth` wide, its padding counted. */
  public async expectBoxWidthAtLeast(umbrellaId: string, minWidth: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.boxWidthOf(umbrellaId)).toBeGreaterThanOrEqual(minWidth);
  }

  private async drawnOf(ids: string[]): Promise<string[]> {
    const drawn = await this.probe.nodeIds();

    return sortedNames(drawn.filter((id) => ids.includes(id)));
  }

  /** The drawn box's width with its padding; `0` while it is not drawn. */
  private async boxWidthOf(umbrellaId: string): Promise<number> {
    const boxId = `${ATOM_BOX_PREFIX}${umbrellaId}`;
    const nodes = await this.probe.nodes();
    const box = nodes.find((node) => node.id === boxId);

    if (box === undefined) return 0;

    return box.width + 2 * ATOM_BOX_PADDING_PX;
  }
}
