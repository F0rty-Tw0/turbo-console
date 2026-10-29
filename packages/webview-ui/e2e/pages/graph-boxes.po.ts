/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeFolder, ProbeNode, ProbeState } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { boxRectOf, folderKeyed, holdsCentre, membershipFaultsOf, overlapFaultsOf } from '../test/utils/graph-folders.spec.util.ts';
import { freeSpotOf } from '../test/utils/graph-geometry.spec.util.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';

const ZOOM_IN_NOTCH = -100;

const NO_BOXES_FAULT = 'no folder box is drawn';

const keyOf = (folder: ProbeFolder): string => folder.folder;

const widthOf = (folder: ProbeFolder): number => folder.renderedWidth;

const stateOf = (folder: ProbeFolder): ProbeState => folder.state;

const centreEntry = (node: ProbeNode): [string, Position] => {
  const centre: Position = { x: node.x, y: node.y };

  return [node.id, centre];
};

const opacityEntry = (node: ProbeNode): [string, number] => [node.id, node.effectiveOpacity];

const nodeNamed = (nodes: ProbeNode[], name: string): ProbeNode => {
  const node = nodes.find((candidate): boolean => candidate.id === name);

  if (node === undefined) throw new Error(`graph e2e: no node ${name} is drawn`);

  return node;
};

/** The folder boxes the page draws and the packages inside them, read through the probe. */
export class GraphBoxesPage {
  public readonly container: Locator;

  protected readonly page: Page;

  protected readonly probe: GraphProbePage;

  private readonly canvas: GraphCanvas;

  public constructor(page: Page) {
    this.page = page;
    this.canvas = new GraphCanvas(page);
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
  }

  /** Every package's model centre. */
  public async modelPositions(): Promise<Positions> {
    const nodes = await this.probe.nodes();

    return Object.fromEntries(nodes.map(centreEntry));
  }

  public async packageOpacities(): Promise<[string, number][]> {
    const nodes = await this.probe.nodes();

    return nodes.map(opacityEntry);
  }

  public async visibleIds(): Promise<string[]> {
    return this.page.evaluate((): string[] => window.__tcGraphProbe?.visibleIds() ?? []);
  }

  /** Wheels in one notch at a time until the narrowest box is `minWidthPx` wide. */
  public async zoomBoxesTo(minWidthPx: number): Promise<void> {
    await this.canvas.zoomUntil(ZOOM_IN_NOTCH, async (): Promise<boolean> => {
      const narrowest = await this.narrowestBox();

      return narrowest >= minWidthPx;
    });
  }

  /** The first grid point of the container that no box covers. */
  public async freeSpot(): Promise<ViewportPoint> {
    const container = await this.container.evaluate(readRect);
    const folders = await this.folders();
    const rects = folders.map(boxRectOf);

    return freeSpotOf(container, rects);
  }

  public async expectFolderKeys(keys: string[]): Promise<void> {
    const sorted = sortedNames(keys);

    await expect.poll(async (): Promise<string[]> => this.folderKeys()).toEqual(sorted);
  }

  public async expectFolderCount(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.folderCount()).toBe(count);
  }

  /** The folder's box lists exactly these packages. */
  public async expectFolderPackages(folder: string, names: string[]): Promise<void> {
    const sorted = sortedNames(names);

    await expect.poll(async (): Promise<string[]> => this.packagesOf(folder)).toEqual(sorted);
  }

  public async expectFolderCollapsed(folder: string, isCollapsed: boolean): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isCollapsed(folder)).toBe(isCollapsed);
  }

  public async expectFolderStates(state: ProbeState): Promise<void> {
    const folders = await this.folders();
    const states = folders.map(stateOf);
    const expected = folders.map((): ProbeState => state);

    expect(states).toEqual(expected);
  }

  public async expectPositionsEqual(before: Positions): Promise<void> {
    await expect.poll(async (): Promise<Positions> => this.modelPositions()).toEqual(before);
  }

  public async expectOpacities(expected: [string, number][]): Promise<void> {
    await expect.poll(async (): Promise<[string, number][]> => this.packageOpacities()).toEqual(expected);
  }

  public async expectVisibleIds(ids: string[]): Promise<void> {
    const sorted = sortedNames(ids);

    await expect.poll(async (): Promise<string[]> => this.visibleIds()).toEqual(sorted);
  }

  /** Every box holds its members' centres and no other package's. */
  public async expectBoxesAroundPackages(): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.membershipFaults()).toEqual([]);
  }

  public async expectNoBoxOverlap(): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.overlapFaults()).toEqual([]);
  }

  public async expectBoxesAtLeast(minWidthPx: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.narrowestBox()).toBeGreaterThanOrEqual(minWidthPx);
  }

  /** The package's centre lies outside the folder's box: the box shrank to its other members. */
  public async expectOutsideBox(name: string, folder: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isInsideBox(name, folder)).toBe(false);
  }

  protected async folders(): Promise<ProbeFolder[]> {
    return this.page.evaluate((): ProbeFolder[] => window.__tcGraphProbe?.folders() ?? []);
  }

  private async folderKeys(): Promise<string[]> {
    const folders = await this.folders();

    return folders.map(keyOf);
  }

  private async folderCount(): Promise<number> {
    const folders = await this.folders();

    return folders.length;
  }

  private async isCollapsed(folder: string): Promise<boolean> {
    const folders = await this.folders();

    return folderKeyed(folders, folder).isCollapsed;
  }

  private async packagesOf(folder: string): Promise<string[]> {
    const folders = await this.folders();

    return sortedNames(folderKeyed(folders, folder).packages);
  }

  /** The narrowest box's rendered width; 0 while no box is drawn. */
  private async narrowestBox(): Promise<number> {
    const folders = await this.folders();

    if (folders.length === 0) return 0;

    const widths = folders.map(widthOf);

    return Math.min(...widths);
  }

  private async membershipFaults(): Promise<string[]> {
    const folders = await this.folders();
    const nodes = await this.probe.nodes();

    if (folders.length === 0) return [NO_BOXES_FAULT];

    return membershipFaultsOf(folders, nodes);
  }

  private async overlapFaults(): Promise<string[]> {
    const folders = await this.folders();

    return overlapFaultsOf(folders);
  }

  private async isInsideBox(name: string, folder: string): Promise<boolean> {
    const folders = await this.folders();
    const nodes = await this.probe.nodes();
    const rect: ElementRect = boxRectOf(folderKeyed(folders, folder));

    return holdsCentre(rect, nodeNamed(nodes, name));
  }
}
