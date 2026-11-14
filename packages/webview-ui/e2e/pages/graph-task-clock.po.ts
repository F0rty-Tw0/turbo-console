import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { GraphRunsMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { TaskRuns } from '../../src/graph/common/task-details.type.ts';
import { postReply } from '../test/utils/graph-host-state.spec.util.ts';

/** The clock on a task card's row 2: posts clocked runs and reads the drawn row back, with no frame wait, so it is safe under a paused page clock. */
export class GraphTaskClock {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /** Posts a `runs` message, with `elapsed` only when given; it waits for no frame. */
  public async sendRuns(runs: TaskRuns, elapsed?: Readonly<Record<string, number>>): Promise<void> {
    const plain: GraphRunsMessage = { type: 'runs', runs };

    if (elapsed === undefined) return this.post(plain);

    const clocked: GraphRunsMessage = { type: 'runs', runs, elapsed };

    await this.post(clocked);
  }

  /** Row 2 of the drawn label of `id`; `null` when the node is missing. */
  public async rowTwoOf(id: string): Promise<string | null> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => candidate.id === id);
    const rows = node?.text.split('\n') ?? [];

    return rows[1] ?? null;
  }

  public async expectRowTwo(id: string, text: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.rowTwoOf(id)).toBe(text);
  }

  private async post(message: GraphRunsMessage): Promise<void> {
    await this.page.evaluate(postReply, JSON.stringify(message));
  }
}
