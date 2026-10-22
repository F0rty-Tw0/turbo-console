import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphFoldersPage } from './graph-folders.po.ts';
import { GraphGroupingPage } from './graph-grouping.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { BoxDragRecord, PackageFlags } from '../common/graph-folders.type.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { gapBetween, hullCentreOf, moveFaultsOf } from '../test/utils/graph-folder-points.spec.util.ts';
import { folderKeyed } from '../test/utils/graph-folders.spec.util.ts';

/** The opacity of a dimmed package, drawn once however many dimmed folders hold it. */
const DIMMED_OPACITY = 0.25;

/** How far a collapsed node's centre may sit from the centre of its packages, in CSS pixels. */
const CENTRE_TOLERANCE_PX = 1;

const flagsOf = (node: ProbeNode): PackageFlags => {
  const { isVisible, isCollapsed } = node;
  const flags: PackageFlags = { isVisible, isCollapsed };

  return flags;
};

const isDimmed = (node: ProbeNode): boolean => node.state === 'dimmed';

const opacityOf = (node: ProbeNode): number => {
  const isFaded = isDimmed(node);

  if (isFaded) return DIMMED_OPACITY;

  return 1;
};

/** The packages inside folders: where a box drag leaves them, how the probe flags them and how opaque they draw. */
export class GraphFolderPackages {
  private readonly folderPage: GraphFoldersPage;
  private readonly grouping: GraphGroupingPage;
  private readonly probe: GraphProbePage;
  private drag: BoxDragRecord | null = null;

  public constructor(page: Page) {
    this.folderPage = new GraphFoldersPage(page);
    this.grouping = new GraphGroupingPage(page);
    this.probe = new GraphProbePage(page);
  }

  /** Drags the box by `dx`, `dy` CSS pixels, noting where every package stood and the zoom before. */
  public async dragBox(folder: string, dx: number, dy: number): Promise<void> {
    const before = await this.grouping.modelPositions();
    const zoom = await this.probe.zoom();

    this.drag = { before, dx, dy, zoom };
    await this.grouping.dragBox(folder, dx, dy);
  }

  /** Each of `names` stands where the last box drag put it: moved once by the drag. */
  public async expectDragMoved(names: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.moveFaults(names, true)).toEqual([]);
  }

  /** Each of `names` stands where it did before the last box drag. */
  public async expectDragStill(names: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.moveFaults(names, false)).toEqual([]);
  }

  /** The collapsed node of `folder` is centred on the bounding box of its packages' centres, within a pixel. */
  public async expectCollapsedCentred(folder: string): Promise<void> {
    await expect.poll(async (): Promise<number> => this.centreGap(folder)).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);
  }

  /** The package link is drawn: a collapsed folder's other links never hide it. */
  public async expectLinkDrawn(source: string, target: string): Promise<void> {
    await expect.poll(async (): Promise<boolean | null> => this.isLinkDrawn(source, target)).toBe(true);
  }

  /** The package link exists and is not drawn: one end sits in a collapsed folder. */
  public async expectLinkHidden(source: string, target: string): Promise<void> {
    await expect.poll(async (): Promise<boolean | null> => this.isLinkDrawn(source, target)).toBe(false);
  }

  /** Every package in `names` reports `flags`. */
  public async expectFlags(names: string[], flags: PackageFlags): Promise<void> {
    await expect.poll(async (): Promise<PackageFlags[]> => this.flagsOf(names)).toEqual(names.map((): PackageFlags => flags));
  }

  /** A dimmed package draws at 0.25 and every other at 1: a dimmed box never fades what it holds a second time. */
  public async expectOpacityMatchesState(): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.opacityFaults()).toEqual([]);
  }

  /** Every package in `names` reads `dimmed`. */
  public async expectDimmed(names: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.notDimmed(names)).toEqual([]);
  }

  private async isLinkDrawn(source: string, target: string): Promise<boolean | null> {
    const edges = await this.probe.edges();
    const link = edges.find((edge): boolean => edge.source === source && edge.target === target);

    return link?.isDrawn ?? null;
  }

  private async moveFaults(names: string[], isMoving: boolean): Promise<string[]> {
    const drag = this.drag;

    if (drag === null) throw new Error('graph e2e: no box was dragged');

    const now: Positions = await this.grouping.modelPositions();

    return moveFaultsOf(names, now, drag, isMoving);
  }

  private async centreGap(folder: string): Promise<number> {
    const folders = await this.folderPage.folders();
    const nodes = await this.probe.nodes();
    const target = folderKeyed(folders, folder);
    const members = nodes.filter((node): boolean => target.packages.includes(node.id));
    const centre: ViewportPoint = { x: target.renderedX, y: target.renderedY };

    return gapBetween(centre, hullCentreOf(members));
  }

  private async flagsOf(names: string[]): Promise<PackageFlags[]> {
    const nodes = await this.probe.nodes();
    const named = nodes.filter((node): boolean => names.includes(node.id));

    return named.map(flagsOf);
  }

  private async opacityFaults(): Promise<string[]> {
    const nodes = await this.probe.nodes();
    const faultOf = (node: ProbeNode): string[] => {
      const expected = opacityOf(node);

      if (node.effectiveOpacity === expected) return [];

      return [`${node.id} draws at ${node.effectiveOpacity}, not ${expected}`];
    };

    return nodes.flatMap(faultOf);
  }

  private async notDimmed(names: string[]): Promise<string[]> {
    const nodes = await this.probe.nodes();
    const named = nodes.filter((node): boolean => names.includes(node.id));

    return named.filter((node): boolean => !isDimmed(node)).map((node): string => node.id);
  }
}
