import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphFoldersPage } from './graph-folders.po.ts';
import { GraphGroupingPage } from './graph-grouping.po.ts';
import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { GraphReady } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeEdge, ProbeEdgeLine, ProbeFolderLink } from '../../src/graph/common/graph-probe.type.ts';
import { isInside, readRect } from '../test/utils/element-rect.spec.util.ts';
import { foreignBoxHitsOf, readFolders } from '../test/utils/graph-foreign-boxes.spec.util.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { positionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

/** A straight line is one segment: its two ends and no bend. */
const STRAIGHT_POINTS = 2;

const STRAIGHT_CURVE = 'straight';

/** How every package edge and folder link draws: a plain bezier under every box and card. */
const PLAIN_LINE = 'bezier bottom';

type DrawnStyle = Pick<ProbeEdge, 'curveStyle' | 'zCompoundDepth'>;

const isDrawnStraight = (line: ProbeEdgeLine): boolean => line.isDrawn && line.points.length === STRAIGHT_POINTS;

const curveStyleOf = (edge: ProbeEdge): string => edge.curveStyle;

const drawnStyleOf = (edge: DrawnStyle): string => `${edge.curveStyle} ${edge.zCompoundDepth}`;

const isDrawn = (edge: ProbeEdge | ProbeFolderLink): boolean => edge.isDrawn;

/** The edge routes the page posts, how it draws its lines, and the reopens that serve a posted layout back from the cache. */
export class GraphRoutes {
  private readonly folders: GraphFoldersPage;
  private readonly grouping: GraphGroupingPage;
  private readonly host: GraphHost;
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.folders = new GraphFoldersPage(page);
    this.grouping = new GraphGroupingPage(page);
    this.host = new GraphHost(page);
    this.probe = new GraphProbePage(page);
  }

  /** The last `positions` message the page posted holds a route for exactly these edge ids, in any order. */
  public async expectPostedRouteIds(ids: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.postedRouteIds()).toStrictEqual(ids.toSorted());
  }

  /** The page draws exactly `count` lines, each `curve-style: straight` and one segment from its source end to its target end. */
  public async expectEveryLineStraight(count: number): Promise<void> {
    const straight = Array.from({ length: count }, (): string => STRAIGHT_CURVE);

    await expect.poll(async (): Promise<string[]> => this.curveStyles()).toStrictEqual(straight);
    await expect.poll(async (): Promise<number[]> => this.lineAndStraightCounts()).toStrictEqual([count, count]);
  }

  /** The page draws at least one package edge and one folder link, and every one is `curve-style: bezier` and `z-compound-depth: bottom`. */
  public async expectEveryLinePlain(): Promise<void> {
    await expect.poll(async (): Promise<string[][]> => this.drawnStyles()).toStrictEqual([[PLAIN_LINE], [PLAIN_LINE]]);
  }

  /** At least one drawn line crosses the title band or the body of a drawn folder box that holds neither of its ends. */
  public async expectSomeLineThroughForeignBoxes(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.foreignBoxHitCount()).toBeGreaterThan(0);
  }

  /** The package's box lies wholly inside the `container`, so a drag that follows grabs a node the user can see. */
  public async expectNodeInView(id: string, container: Locator): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isNodeInView(id, container)).toBe(true);
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

  private async isNodeInView(id: string, container: Locator): Promise<boolean> {
    const rect = await container.evaluate(readRect);
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) return false;

    return isInside(nodeBoxOf(node, zoom), rect);
  }

  private async curveStyles(): Promise<string[]> {
    const edges = await this.probe.edges();

    return edges.map(curveStyleOf);
  }

  /** The distinct drawn styles of the drawn package edges, then of the drawn folder links. */
  private async drawnStyles(): Promise<string[][]> {
    const edges = await this.probe.edges();
    const links = await this.folders.folderLinks();
    const edgeStyles = new Set(edges.filter(isDrawn).map(drawnStyleOf));
    const linkStyles = new Set(links.filter(isDrawn).map(drawnStyleOf));
    const styles = [[...edgeStyles], [...linkStyles]];

    return styles;
  }

  private async lineAndStraightCounts(): Promise<number[]> {
    const lines = await readEdgeLines(this.page);
    const straight = lines.filter(isDrawnStraight);
    const counts = [lines.length, straight.length];

    return counts;
  }

  private async foreignBoxHitCount(): Promise<number> {
    const lines = await readEdgeLines(this.page);
    const folders = await readFolders(this.page);
    const zoom = await this.probe.zoom();

    return foreignBoxHitsOf(lines, folders, zoom);
  }

  private async postedRouteIds(): Promise<string[]> {
    const posted = await readPosted(this.page);
    const last = positionsPosted(posted).at(-1);
    const routes = last?.routes ?? {};

    return Object.keys(routes).toSorted();
  }
}
