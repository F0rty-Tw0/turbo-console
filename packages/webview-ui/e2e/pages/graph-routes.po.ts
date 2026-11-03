import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphGroupingPage } from './graph-grouping.po.ts';
import { GraphHost } from './graph-host.po.ts';
import type { GraphReady } from '../../src/bridge/common/graph-state.type.ts';
import { positionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

/** The edge routes the page posts beside its positions, and the reopen that serves a posted layout back from the cache. */
export class GraphRoutes {
  private readonly grouping: GraphGroupingPage;
  private readonly host: GraphHost;
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.grouping = new GraphGroupingPage(page);
    this.host = new GraphHost(page);
  }

  /** The last `positions` message the page posted holds a route for exactly these edge ids, in any order. */
  public async expectPostedRouteIds(ids: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.postedRouteIds()).toStrictEqual(ids.toSorted());
  }

  /** The view is saved, the page is reopened, and `state` is sent with the last posted folders layout as its folder cache. */
  public async reopenWithPostedFoldersCached(state: GraphReady): Promise<void> {
    const { positions, routes } = await this.grouping.postedLayout();
    const cached: GraphReady = { ...state, folderPositions: positions, folderRoutes: routes };

    await this.host.expectViewSaved();
    await this.host.reopen();
    await this.host.sendState(cached);
  }

  private async postedRouteIds(): Promise<string[]> {
    const posted = await readPosted(this.page);
    const last = positionsPosted(posted).at(-1);
    const routes = last?.routes ?? {};

    return Object.keys(routes).toSorted();
  }
}
