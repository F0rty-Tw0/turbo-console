import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { GraphTaskProbe } from './graph-task-probe.po.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import { drawnIdsOf } from '../test/utils/graph-atom-nodes.spec.util.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';

const stayingOf = (positions: Positions, movable: string[]): Positions => {
  const isStaying = ([id]: [string, Position]): boolean => !movable.includes(id);
  const entries = Object.entries(positions).filter(isStaying);

  return Object.fromEntries(entries);
};

/** The file nodes of an expanded Atomizer group that is capped, read through the probe. */
export class GraphAtomCap {
  private readonly probe: GraphProbePage;
  private readonly tasks: GraphTaskProbe;

  public constructor(page: Page) {
    this.probe = new GraphProbePage(page);
    this.tasks = new GraphTaskProbe(page);
  }

  /** Of `ids`, exactly `expected` are drawn. */
  public async expectDrawnOf(ids: string[], expected: string[]): Promise<void> {
    const sorted = sortedNames(expected);

    await expect.poll(async (): Promise<string[]> => drawnIdsOf(this.probe, ids)).toEqual(sorted);
  }

  /** Every node but `movable` sits where `before` has it. */
  public async expectNodesStayed(before: Positions, movable: string[]): Promise<void> {
    const now = await this.tasks.taskPositions();

    expect(stayingOf(now, movable)).toEqual(stayingOf(before, movable));
  }

  /** The node `id` sits where `before` has the node `slotId`: it took that node's slot in the grid. */
  public async expectInSlotOf(id: string, before: Positions, slotId: string): Promise<void> {
    const now = await this.tasks.taskPositions();

    expect(now[id], `${id} sits in the slot of ${slotId}`).toEqual(before[slotId]);
  }
}
