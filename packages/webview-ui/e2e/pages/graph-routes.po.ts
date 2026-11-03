import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphGroupingPage } from './graph-grouping.po.ts';
import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { GraphReady } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeEdgeLine } from '../../src/graph/common/graph-probe.type.ts';
import { edgeIdOf } from '../../src/graph/utils/edge-id.util.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { isLineInside, midpointsUnderCountOf, readEdgeLines, throughNodeCountOf } from '../test/utils/graph-lines.spec.util.ts';
import { positionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

/** A routed line has its two ends and at least one bend. */
const ROUTED_POINTS_MIN = 3;

/** How far inside a node's box a line must reach to count as passing through it, in page px. */
const THROUGH_INSET_PX = 2;

const lineIdOf = (line: ProbeEdgeLine): string => edgeIdOf({ source: line.source, target: line.target });

const isDrawnRouted = (line: ProbeEdgeLine): boolean => line.isDrawn && line.isRouted && line.points.length >= ROUTED_POINTS_MIN;

/** The edge routes the page posts and draws, and the reopens that serve a posted layout back from the cache. */
export class GraphRoutes {
  private readonly grouping: GraphGroupingPage;
  private readonly host: GraphHost;
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.grouping = new GraphGroupingPage(page);
    this.host = new GraphHost(page);
    this.probe = new GraphProbePage(page);
  }

  /** The last `positions` message the page posted holds a route for exactly these edge ids, in any order. */
  public async expectPostedRouteIds(ids: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.postedRouteIds()).toStrictEqual(ids.toSorted());
  }

  /** Every one of the `count` package lines is drawn on its route, with at least one bend between its ends. */
  public async expectEveryLineRouted(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.drawnRoutedCount()).toBe(count);
  }

  /** Every drawn line, bends included, lies inside the `container`. */
  public async expectEveryLineInside(container: Locator): Promise<void> {
    await expect.poll(async (): Promise<number> => this.outsideLineCount(container)).toBe(0);
  }

  /** The lines of exactly the `touched` edge ids are straight; every other line is drawn on its route. */
  public async expectRoutedExcept(touched: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.straightIds()).toStrictEqual(touched.toSorted());
    await expect.poll(async (): Promise<boolean> => this.isRestRouted()).toBe(true);
  }

  /** How many pairs of a drawn line and a node that is not one of its ends have the line cross the node, 2 px inside it. */
  public async throughNodeCount(): Promise<number> {
    const lines = await readEdgeLines(this.page);
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();

    return throughNodeCountOf(lines, nodes, zoom, THROUGH_INSET_PX);
  }

  /** How many drawn lines have their midpoint inside a node's box. */
  public async midpointsUnderCount(): Promise<number> {
    const lines = await readEdgeLines(this.page);
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();

    return midpointsUnderCountOf(lines, nodes, zoom);
  }

  /** The view is saved, the page is reopened, and `state` is sent with the last posted flat layout as its flat cache. */
  public async reopenWithPostedFlatCached(state: GraphReady): Promise<void> {
    const { positions, routes } = await this.grouping.postedLayout();
    const cached: GraphReady = { ...state, positions, routes };

    await this.reopenWith(cached);
  }

  /** The view is saved, the page is reopened, and `state` is sent with the last posted folders layout as its folder cache. */
  public async reopenWithPostedFoldersCached(state: GraphReady): Promise<void> {
    const { positions, routes } = await this.grouping.postedLayout();
    const cached: GraphReady = { ...state, folderPositions: positions, folderRoutes: routes };

    await this.reopenWith(cached);
  }

  private async reopenWith(cached: GraphReady): Promise<void> {
    await this.host.expectViewSaved();
    await this.host.reopen();
    await this.host.sendState(cached);
  }

  private async outsideLineCount(container: Locator): Promise<number> {
    const rect = await container.evaluate(readRect);
    const lines = await readEdgeLines(this.page);
    const drawn = lines.filter((line): boolean => line.isDrawn);
    const outside = drawn.filter((line): boolean => !isLineInside(line, rect));

    return outside.length;
  }

  private async drawnRoutedCount(): Promise<number> {
    const lines = await readEdgeLines(this.page);

    return lines.filter(isDrawnRouted).length;
  }

  private async straightIds(): Promise<string[]> {
    const lines = await readEdgeLines(this.page);
    const straight = lines.filter((line): boolean => !line.isRouted);

    return straight.map(lineIdOf).toSorted();
  }

  private async isRestRouted(): Promise<boolean> {
    const lines = await readEdgeLines(this.page);
    const routed = lines.filter((line): boolean => line.isRouted);

    return routed.every(isDrawnRouted);
  }

  private async postedRouteIds(): Promise<string[]> {
    const posted = await readPosted(this.page);
    const last = positionsPosted(posted).at(-1);
    const routes = last?.routes ?? {};

    return Object.keys(routes).toSorted();
  }
}
