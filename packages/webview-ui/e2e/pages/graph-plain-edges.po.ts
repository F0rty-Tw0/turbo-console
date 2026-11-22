import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphFoldersPage } from './graph-folders.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeEdge, ProbeFolderLink } from '../../src/graph/common/graph-probe.type.ts';
import type { FolderLinksShown } from '../common/graph-folder-links.type.ts';
import type { Rgb } from '../common/graph-title-chip.type.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { foreignBoxHitsOf, readFolders } from '../test/utils/graph-foreign-boxes.spec.util.ts';
import { clipAround, inkTowardOf, pixelsOfPng } from '../test/utils/graph-line-ink.spec.util.ts';
import { lineMidpointOf, readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';

/** How every package edge and folder link draws: a plain bezier at card depth, over every folder box. */
const PLAIN_LINE = 'bezier auto';

/** How far around a line's midpoint the screen is read, so a rounding of the midpoint cannot miss a 1 px line. */
const INK_RADIUS_PX = 2;

/** The least share of the way from the box fill to the edge colour the line's inkiest pixel reaches: a 0.75 px line is anti-aliased. */
const MIN_INK = 0.25;

/** The distinct drawn folder link styles while folder links show, and while none do. */
const LINK_STYLES: Record<FolderLinksShown, string[]> = { some: [PLAIN_LINE], none: [] };

type DrawnStyle = Pick<ProbeEdge, 'curveStyle' | 'zCompoundDepth'>;

type EdgeEnds = Pick<ProbeEdge, 'source' | 'target'>;

const drawnStyleOf = (edge: DrawnStyle): string => `${edge.curveStyle} ${edge.zCompoundDepth}`;

const isDrawn = (edge: ProbeEdge | ProbeFolderLink): boolean => edge.isDrawn;

/** How the page draws its package edges and folder links: their style, the boxes they cross and the ink they leave. */
export class GraphPlainEdges {
  private readonly folders: GraphFoldersPage;
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.folders = new GraphFoldersPage(page);
    this.probe = new GraphProbePage(page);
  }

  /** The page draws at least one package edge, and folder links as `shown`; every one is `curve-style: bezier` and `z-compound-depth: auto`. */
  public async expectEveryLinePlain(shown: FolderLinksShown): Promise<void> {
    await expect.poll(async (): Promise<string[][]> => this.drawnStyles()).toStrictEqual([[PLAIN_LINE], LINK_STYLES[shown]]);
  }

  /** At least one drawn line crosses the title band or the body of a drawn folder box that holds neither of its ends. */
  public async expectSomeLineThroughForeignBoxes(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.foreignBoxHitCount()).toBeGreaterThan(0);
  }

  /**
   * Polls until the line between `ends` reaches `MIN_INK` over the box `fill` (`inkOnEdge`), then records the ink it
   * reached as an `edge-ink` annotation for `label`.
   */
  public async expectInkOnEdge(ends: EdgeEnds, fill: Rgb, edge: Rgb, label: string): Promise<void> {
    const { source, target } = ends;
    const inkOf = async (): Promise<number> => this.inkOnEdge(source, target, fill, edge);

    await expect.poll(inkOf, { message: `no edge ink at the ${source} to ${target} midpoint` }).toBeGreaterThanOrEqual(MIN_INK);

    const ink = await inkOf();

    test.info().annotations.push({ type: 'edge-ink', description: `${label}: ${ink.toFixed(2)}` });
  }

  /** The midpoint of the drawn package edge from `source` to `target`, in page px. */
  public async midpointOf(source: string, target: string): Promise<ViewportPoint> {
    const lines = await readEdgeLines(this.page);

    return lineMidpointOf(lines, source, target);
  }

  /** How far the screen around the midpoint of the drawn package edge from `source` to `target` has moved from the box `fill` toward the `edge` colour, 0 to 1 (`inkTowardOf`). */
  public async inkOnEdge(source: string, target: string, fill: Rgb, edge: Rgb): Promise<number> {
    const midpoint = await this.midpointOf(source, target);
    const png = await this.page.screenshot({ clip: clipAround(midpoint, INK_RADIUS_PX) });
    const pixels = await this.page.evaluate(pixelsOfPng, png.toString('base64'));

    return inkTowardOf(pixels, fill, edge);
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

  private async foreignBoxHitCount(): Promise<number> {
    const lines = await readEdgeLines(this.page);
    const folders = await readFolders(this.page);
    const zoom = await this.probe.zoom();

    return foreignBoxHitsOf(lines, folders, zoom);
  }
}
