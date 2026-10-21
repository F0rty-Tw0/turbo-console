import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { EdgeExplainResult, GraphEdgeExplainedMessage } from '../../src/bridge/common/graph-message.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { ExplainEdgeMessage, OpenManifestMessage } from '../common/graph.type.ts';
import { postReply } from '../test/utils/graph-host-state.spec.util.ts';
import { explainEdgePosted, lastExplainPosted, openManifestPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

/** The host stand-in's explain side: the `explainEdge` and `openManifest` messages the page posted, and the replies it gets. */
export class GraphExplainHost {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Answers the newest `explainEdge` the page posted, once there is one. */
  public async answerExplain(result: EdgeExplainResult): Promise<void> {
    await expect.poll(async (): Promise<ExplainEdgeMessage | null> => this.lastAsked()).not.toBeNull();

    const asked = await this.lastAsked();

    if (asked === null) throw new Error('graph e2e: the page asked the host to explain nothing');

    await this.answerExplainFor(asked.source, asked.target, result);
  }

  /** Answers as if the host had been asked about `source` and `target`, whatever the page asked; returns once the page has handled it. */
  public async answerExplainFor(source: string, target: string, result: EdgeExplainResult): Promise<void> {
    const reply: GraphEdgeExplainedMessage = { type: 'edgeExplained', source, target, result };

    await this.page.evaluate(postReply, reply);
    await this.page.evaluate(NEXT_FRAME);
  }

  /** The page has asked to explain the link exactly `times` times. */
  public async expectExplainAsked(source: string, target: string, times: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.askedCount(source, target)).toBe(times);
  }

  public async expectNoExplainAsked(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    const posted = await readPosted(this.page);

    expect(explainEdgePosted(posted)).toEqual([]);
  }

  public async expectOpenManifestPosted(messages: OpenManifestMessage[]): Promise<void> {
    await expect.poll(async (): Promise<OpenManifestMessage[]> => this.openManifests()).toEqual(messages);
  }

  public async expectNoOpenManifest(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    const messages = await this.openManifests();

    expect(messages).toEqual([]);
  }

  private async lastAsked(): Promise<ExplainEdgeMessage | null> {
    const posted = await readPosted(this.page);

    return lastExplainPosted(posted);
  }

  private async askedCount(source: string, target: string): Promise<number> {
    const posted = await readPosted(this.page);
    const asked = explainEdgePosted(posted);
    const isLink = (message: ExplainEdgeMessage): boolean => message.source === source && message.target === target;

    return asked.filter(isLink).length;
  }

  private async openManifests(): Promise<OpenManifestMessage[]> {
    const posted = await readPosted(this.page);

    return openManifestPosted(posted);
  }
}
