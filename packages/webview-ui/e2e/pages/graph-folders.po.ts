/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphPackageList } from './graph-package-list.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphTimings } from './graph-timings.po.ts';
import type { ProbeFolder, ProbeFolderLink } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { folderTitleOf } from '../../src/graph/utils/controls-text.util.ts';
import type { FolderFacts, FolderLinkFacts, FolderPaint } from '../common/graph-folders.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import {
  factsOf,
  folderStateEntry,
  linkFactsOf,
  linkStateEntry,
  sortedFolders,
  sortedLinks
} from '../test/utils/graph-folder-facts.spec.util.ts';
import { boxCornerOf, endCentreOf, folderTapOf, linkPointOf } from '../test/utils/graph-folder-points.spec.util.ts';
import { folderKeyed, isFolderInView } from '../test/utils/graph-folders.spec.util.ts';
import { expectMinUnder } from '../test/utils/graph-min-under.spec.util.ts';

/** The accessible name of a folder's list header button. */
const toggleNameOf = (folder: string, isCollapsing: boolean): string => {
  const verb = isCollapsing ? 'Collapse' : 'Expand';

  return `${verb} folder ${folderTitleOf(folder)}`;
};

/** The folders the page draws, their links, and the taps and list buttons that collapse and expand them. */
export class GraphFoldersPage {
  private readonly list: GraphPackageList;
  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly timings: GraphTimings;
  private collapseSamples: number[] = [];
  private expandSamples: number[] = [];

  public constructor(page: Page) {
    this.page = page;
    this.list = new GraphPackageList(page);
    this.probe = new GraphProbePage(page);
    this.timings = new GraphTimings(page);
  }

  public async folders(): Promise<ProbeFolder[]> {
    return this.page.evaluate((): ProbeFolder[] => window.__tcGraphProbe?.folders() ?? []);
  }

  public async folderLinks(): Promise<ProbeFolderLink[]> {
    return this.page.evaluate((): ProbeFolderLink[] => window.__tcGraphProbe?.folderLinks() ?? []);
  }

  /** Taps the collapsed node's centre, or a box's top left corner. */
  public async tapFolder(folder: string): Promise<void> {
    const folders = await this.folders();
    const point = folderTapOf(folderKeyed(folders, folder));

    await this.page.mouse.click(point.x, point.y);
  }

  public async doubleTapFolder(folder: string): Promise<void> {
    const folders = await this.folders();
    const point = folderTapOf(folderKeyed(folders, folder));

    await this.page.mouse.dblclick(point.x, point.y);
  }

  /** Double taps the box's top left corner, inside its padding and clear of its packages. */
  public async doubleTapBoxPadding(folder: string): Promise<void> {
    const folders = await this.folders();
    const point = boxCornerOf(folderKeyed(folders, folder));

    await this.page.mouse.dblclick(point.x, point.y);
  }

  /** Taps `t` of the way along the link from its source end to its target end; an end is a collapsed folder key or a package name. */
  public async tapFolderLink(source: string, target: string, t: number): Promise<void> {
    const folders = await this.folders();
    const nodes = await this.probe.nodes();
    const from = endCentreOf(source, folders, nodes);
    const to = endCentreOf(target, folders, nodes);
    const point = linkPointOf(from, to, t);

    await this.page.mouse.click(point.x, point.y);
  }

  /** Presses the folder's list header button: Collapse when `isCollapsing`, else Expand. */
  public async toggleInList(folder: string, isCollapsing: boolean): Promise<void> {
    await this.list.pressFolderToggle(toggleNameOf(folder, isCollapsing));
  }

  /** Per round, collapses each folder in turn, then expands each, keeping the probe's `toggleMs` after every press. */
  public async collectToggleMs(folders: string[], rounds: number): Promise<void> {
    this.collapseSamples = [];
    this.expandSamples = [];

    for (let round = 0; round < rounds; round += 1) {
      await this.toggleEach(folders, true, this.collapseSamples);
      await this.toggleEach(folders, false, this.expandSamples);
    }
  }

  /** There were `count` collapses and `count` expands, and the fastest of each was under `ms`. */
  public expectToggleMinUnder(ms: number, count: number): void {
    expect(this.collapseSamples).toHaveLength(count);
    expect(this.expandSamples).toHaveLength(count);
    expectMinUnder('collapse-ms', this.collapseSamples, ms);
    expectMinUnder('expand-ms', this.expandSamples, ms);
  }

  /** The folder's list header button draws the Collapse chevron while expanded and the Expand chevron while collapsed. */
  public async expectListToggle(folder: string, isExpanded: boolean): Promise<void> {
    const text = isExpanded ? 'Collapse' : 'Expand';

    await this.list.expectFolderToggle(toggleNameOf(folder, isExpanded), text, isExpanded);
  }

  public async expectFolders(expected: FolderFacts[]): Promise<void> {
    await expect.poll(async (): Promise<FolderFacts[]> => this.folderFacts()).toEqual(sortedFolders(expected));
  }

  public async expectFolderLinks(expected: FolderLinkFacts[]): Promise<void> {
    await expect.poll(async (): Promise<FolderLinkFacts[]> => this.linkFacts()).toEqual(sortedLinks(expected));
  }

  public async expectFolderVisible(folder: string, isVisible: boolean): Promise<void> {
    await expect.poll(async (): Promise<boolean | undefined> => this.isVisible(folder)).toBe(isVisible);
  }

  /** Every folder reads its state in `paint.folders` and every drawn folder link its state in `paint.links`. */
  public async expectPaint(paint: FolderPaint): Promise<void> {
    await expect.poll(async (): Promise<FolderPaint['folders']> => this.folderStates()).toEqual(paint.folders);
    await expect.poll(async (): Promise<FolderPaint['links']> => this.linkStates()).toEqual(paint.links);
  }

  /** At least one folder is drawn and every one is collapsed, or, for `false`, expanded. */
  public async expectAllCollapsed(isCollapsed: boolean): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.areAll(isCollapsed)).toBe(true);
  }

  /** Every folder in `keys` overlaps the canvas. */
  public async expectFoldersInView(keys: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.outOfView(keys)).toEqual([]);
  }

  private async toggleEach(folders: string[], isCollapsing: boolean, samples: number[]): Promise<void> {
    for (const folder of folders) {
      await this.toggleInList(folder, isCollapsing);
      await expect.poll(async (): Promise<number | null> => this.timings.toggleMs()).not.toBeNull();

      const sample = await this.timings.toggleMs();

      samples.push(sample ?? Number.NaN);
    }
  }

  private async folderFacts(): Promise<FolderFacts[]> {
    const folders = await this.folders();

    return sortedFolders(folders.map(factsOf));
  }

  private async linkFacts(): Promise<FolderLinkFacts[]> {
    const links = await this.folderLinks();

    return sortedLinks(links.map(linkFactsOf));
  }

  private async isVisible(folder: string): Promise<boolean | undefined> {
    const folders = await this.folders();
    const found = folders.find((candidate): boolean => candidate.folder === folder);

    return found?.isVisible;
  }

  private async folderStates(): Promise<FolderPaint['folders']> {
    const folders = await this.folders();

    return Object.fromEntries(folders.map(folderStateEntry));
  }

  private async linkStates(): Promise<FolderPaint['links']> {
    const links = await this.folderLinks();

    return Object.fromEntries(links.map(linkStateEntry));
  }

  private async areAll(isCollapsed: boolean): Promise<boolean> {
    const folders = await this.folders();
    const isState = (folder: ProbeFolder): boolean => folder.isCollapsed === isCollapsed;

    return folders.length > 0 && folders.every(isState);
  }

  private async outOfView(keys: string[]): Promise<string[]> {
    const container = this.page.getByRole('application', { name: GRAPH_LABEL });
    const canvas = await container.evaluate(readRect);
    const folders = await this.folders();
    const isOut = (key: string): boolean => !isFolderInView(canvas, folderKeyed(folders, key));

    return keys.filter(isOut);
  }
}
