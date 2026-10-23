import type { Page } from '@playwright/test';

import type { GraphRunsMessage, GraphShowTasksMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { GraphRunState } from '../../src/bridge/common/graph-state.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import { postReply } from '../test/utils/graph-host-state.spec.util.ts';

/** The host stand-in's task side: the `runs` and `showTasks` messages the page gets, and any raw message a test wants it to survive. */
export class GraphTaskHost {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async sendRuns(runs: Readonly<Record<string, GraphRunState>>): Promise<void> {
    const message: GraphRunsMessage = { type: 'runs', runs };

    await this.sendRaw(message);
  }

  public async sendShowTasks(taskIds: string[]): Promise<void> {
    const message: GraphShowTasksMessage = { type: 'showTasks', taskIds };

    await this.sendRaw(message);
  }

  /** Posts `message` as the host would, then waits a frame so the page has handled it. */
  public async sendRaw(message: unknown): Promise<void> {
    const json = JSON.stringify(message);

    await this.page.evaluate(postReply, json);
    await this.page.evaluate(NEXT_FRAME);
  }
}
