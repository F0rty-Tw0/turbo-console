import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { GraphRunsMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { TaskRuns } from '../../src/graph/common/task-details.type.ts';
import { postReply } from '../test/utils/graph-host-state.spec.util.ts';

/** Shadows both visibility getters on the document itself, so `document.hidden` reads true, then tells the page. */
const HIDE_PAGE = `
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
`;

/** Drops the shadows, so the prototype getters read the real visible page again, then tells the page. */
const SHOW_PAGE = `
  delete document.visibilityState;
  delete document.hidden;
  document.dispatchEvent(new Event('visibilitychange'));
`;

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

  /** Row 2 of `id` once it differs from `before`; the unchanged row when `timeoutMs` passes first. */
  public async rowTwoChangedFrom(id: string, before: string | null, timeoutMs: number): Promise<string | null> {
    const changed = expect.poll(async (): Promise<string | null> => this.rowTwoOf(id), { timeout: timeoutMs }).not.toBe(before);

    await changed.catch((): void => undefined);

    return this.rowTwoOf(id);
  }

  public async expectRowTwo(id: string, text: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.rowTwoOf(id)).toBe(text);
  }

  public async hidePage(): Promise<void> {
    await this.page.evaluate(HIDE_PAGE);
  }

  public async showPage(): Promise<void> {
    await this.page.evaluate(SHOW_PAGE);
  }

  private async post(message: GraphRunsMessage): Promise<void> {
    await this.page.evaluate(postReply, JSON.stringify(message));
  }
}
