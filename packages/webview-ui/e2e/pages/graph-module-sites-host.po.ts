import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type {
  GraphModuleSitesMessage,
  GraphScanModuleSitesMessage,
  ModuleSitesResult
} from '../../src/bridge/common/graph-module-sites.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import { postReply } from '../test/utils/graph-host-state.spec.util.ts';
import { readPosted, scanModuleSitesPosted } from '../test/utils/graph-posted.spec.util.ts';

/** The host stand-in's module sites side: the `scanModuleSites` asks out, the `moduleSites` replies in. */
export class GraphModuleSitesHost {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /**
   * Polls until the page's `scanModuleSites` asks are exactly `asks`, oldest first, then waits a frame and reads once more,
   * so a duplicate ask that lands after the first match fails the check instead of passing it.
   */
  public async expectSitesAsked(asks: GraphScanModuleSitesMessage[]): Promise<void> {
    await expect.poll(async (): Promise<GraphScanModuleSitesMessage[]> => this.asked()).toEqual(asks);
    await this.page.evaluate(NEXT_FRAME);

    const settled = await this.asked();

    expect(settled).toEqual(asks);
  }

  /** Once the page has posted `ask`, answers it with `result`; returns a frame after the page has the reply. */
  public async answerSites(ask: GraphScanModuleSitesMessage, result: ModuleSitesResult): Promise<void> {
    await expect.poll(async (): Promise<GraphScanModuleSitesMessage[]> => this.asked()).toContainEqual(ask);

    const reply: GraphModuleSitesMessage = { type: 'moduleSites', packageName: ask.packageName, from: ask.from, to: ask.to, result };
    const json = JSON.stringify(reply);

    await this.page.evaluate(postReply, json);
    await this.page.evaluate(NEXT_FRAME);
  }

  private async asked(): Promise<GraphScanModuleSitesMessage[]> {
    const posted = await readPosted(this.page);

    return scanModuleSitesPosted(posted);
  }
}
