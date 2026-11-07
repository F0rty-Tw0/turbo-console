import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type {
  EdgeImportsResult,
  GraphEdgeImportsMessage,
  GraphOpenImportMessage
} from '../../src/bridge/common/graph-imports.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { ScanImportsMessage } from '../common/graph.type.ts';
import { postReply } from '../test/utils/graph-host-state.spec.util.ts';
import { openImportPosted, readPosted, scanImportsPosted } from '../test/utils/graph-posted.spec.util.ts';

/** The host stand-in's imports side: the `scanImports` and `openImport` messages the page posted, and the replies it gets. */
export class GraphImportsHost {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Answers the newest `scanImports` the page posted, once the page has posted `askCount` of them. */
  public async answerImports(result: EdgeImportsResult, askCount = 1): Promise<void> {
    await expect.poll(async (): Promise<number> => this.askedCount()).toBeGreaterThanOrEqual(askCount);

    const asked = await this.lastAsked();

    if (asked === null) throw new Error('graph e2e: the page asked the host to scan nothing');

    await this.answerImportsFor(asked.source, asked.target, result);
  }

  /** Answers as if the host had been asked about `source` and `target`, whatever the page asked; returns once the page has handled it. */
  public async answerImportsFor(source: string, target: string, result: EdgeImportsResult): Promise<void> {
    const reply: GraphEdgeImportsMessage = { type: 'edgeImports', source, target, result };
    const json = JSON.stringify(reply);

    await this.page.evaluate(postReply, json);
    await this.page.evaluate(NEXT_FRAME);
  }

  public async expectOpenImportPosted(messages: GraphOpenImportMessage[]): Promise<void> {
    await expect.poll(async (): Promise<GraphOpenImportMessage[]> => this.openImports()).toEqual(messages);
  }

  public async expectNoOpenImport(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    const messages = await this.openImports();

    expect(messages).toEqual([]);
  }

  private async askedCount(): Promise<number> {
    const posted = await readPosted(this.page);

    return scanImportsPosted(posted).length;
  }

  private async lastAsked(): Promise<ScanImportsMessage | null> {
    const posted = await readPosted(this.page);

    return scanImportsPosted(posted).at(-1) ?? null;
  }

  private async openImports(): Promise<GraphOpenImportMessage[]> {
    const posted = await readPosted(this.page);

    return openImportPosted(posted);
  }
}
