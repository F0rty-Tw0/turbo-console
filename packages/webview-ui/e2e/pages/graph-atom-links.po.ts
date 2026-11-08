import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeEdgeLine, ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { readEdgeLines, throughNodeCountOf } from '../test/utils/graph-lines.spec.util.ts';

/** How far, in page px, a line must reach inside a file's box to count as crossing it, so one grazing its border does not. */
const THROUGH_INSET_PX = 1;

/** Hundredths of a page px: a line drawn again on the same segments can land a float rounding step off. */
const POINT_PRECISION = 100;

const roundedOf = (value: number): number => Math.round(value * POINT_PRECISION) / POINT_PRECISION;

const roundedPointOf = (point: ViewportPoint): ViewportPoint => {
  const rounded: ViewportPoint = { x: roundedOf(point.x), y: roundedOf(point.y) };

  return rounded;
};

/** The drawn lines around an Atomizer group: the ones out of its umbrella, and the ones crossing its files. */
export class GraphAtomLinks {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /** The drawn points of each line out of `umbrellaId`, by target, once `count` of them are drawn. */
  public async pointsFrom(umbrellaId: string, count: number): Promise<Record<string, ViewportPoint[]>> {
    const countOf = async (): Promise<number> => {
      const points = await this.drawnPointsFrom(umbrellaId);

      return Object.keys(points).length;
    };

    await expect.poll(countOf).toBe(count);

    return this.drawnPointsFrom(umbrellaId);
  }

  /** The lines out of `umbrellaId` are drawn through `points`, by target. */
  public async expectPointsFrom(umbrellaId: string, points: Record<string, ViewportPoint[]>): Promise<void> {
    await expect.poll(async (): Promise<Record<string, ViewportPoint[]>> => this.drawnPointsFrom(umbrellaId)).toEqual(points);
  }

  /**
   * `count` lines out of `umbrellaId` are drawn straight: unrouted, one segment each. Read from the line state, not page
   * points, so it holds whatever the camera and however late Cytoscape recomputes the drawn ends.
   */
  public async expectStraightFrom(umbrellaId: string, count: number): Promise<void> {
    const straightCountOf = async (): Promise<number> => {
      const lines = await readEdgeLines(this.page);
      const isStraightFrom = (line: ProbeEdgeLine): boolean =>
        line.source === umbrellaId && line.isDrawn && !line.isRouted && line.points.length === 2;

      return lines.filter(isStraightFrom).length;
    };

    await expect.poll(straightCountOf).toBe(count);
  }

  /** The model centre of node `id`, rounded to hundredths. */
  public async centreOf(id: string): Promise<ViewportPoint> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate: ProbeNode): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: node ${id} is not drawn`);

    return roundedPointOf({ x: node.x, y: node.y });
  }

  /** Node `id` sits at `centre`, to hundredths of a model px. */
  public async expectCentreOf(id: string, centre: ViewportPoint): Promise<void> {
    await expect.poll(async (): Promise<ViewportPoint> => this.centreOf(id)).toEqual(centre);
  }

  /** `count` pairs of a drawn line and one of the `fileIds` have the line cross the file's box, `THROUGH_INSET_PX` in. */
  public async expectThroughFiles(fileIds: string[], count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.throughFilesOf(fileIds)).toBe(count);
  }

  private async drawnPointsFrom(umbrellaId: string): Promise<Record<string, ViewportPoint[]>> {
    const lines = await readEdgeLines(this.page);
    const isFrom = (line: ProbeEdgeLine): boolean => line.source === umbrellaId && line.isDrawn;
    const entryOf = (line: ProbeEdgeLine): [string, ViewportPoint[]] => [line.target, line.points.map(roundedPointOf)];
    const fromLines = lines.filter(isFrom);
    const entries = fromLines.map(entryOf);

    return Object.fromEntries(entries);
  }

  private async throughFilesOf(fileIds: string[]): Promise<number> {
    const lines = await readEdgeLines(this.page);
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const isFile = (node: ProbeNode): boolean => fileIds.includes(node.id);
    const files = nodes.filter(isFile);

    return throughNodeCountOf(lines, files, zoom, THROUGH_INSET_PX);
  }
}
