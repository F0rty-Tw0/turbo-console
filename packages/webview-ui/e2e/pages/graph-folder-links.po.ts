import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { FolderLinkCounts, LinkRead, RoutedLink } from '../common/graph-folder-links.type.ts';
import {
  countsOf,
  idsNotEndingOn,
  isReady,
  readLinks,
  routedLinksOf,
  routedPackageEndOf
} from '../test/utils/graph-folder-links.spec.util.ts';

/** The folder links the page draws, read one probe snapshot at a time. */
export class GraphFolderLinks {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Every folder link is drawn with a sized label and a line, and at least one is drawn. */
  public async expectDrawn(): Promise<void> {
    await expect.poll(async (): Promise<boolean> => isReady(await this.read())).toBe(true);
  }

  /** Each oracle's count for the links now, for the rows to annotate. */
  public async counts(): Promise<FolderLinkCounts> {
    return countsOf(await this.read());
  }

  /** No drawn folder link crosses a drawn node that is not one of its ends, 2 px inside the node's box. */
  public async expectNoFolderLinkThroughNodes(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.countOf('throughNodes')).toBe(0);
  }

  /** No drawn folder link crosses the title band or the body of a drawn folder box that holds neither of its ends. */
  public async expectNoFolderLinkOverForeignBoxes(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.countOf('foreignBoxes')).toBe(0);
  }

  /** No link's line meets its own label's box. */
  public async expectLabelsOffTheirLines(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.countOf('labelsOnLine')).toBe(0);
  }

  /** Each collapsed end lies outside its node's box shrunk by 3 px times the zoom and inside the box grown by 8 px times the zoom. */
  public async expectCollapsedEndsOnBorder(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.countOf('offBorder')).toBe(0);
  }

  public async routedFolderLinkCount(): Promise<number> {
    return this.countOf('routed');
  }

  /** The drawn folder links that run on a route, by id order. */
  public async routedLinks(): Promise<RoutedLink[]> {
    return routedLinksOf(await this.read());
  }

  /** The first routed link's end that is a package; throws when no routed link ends on one. */
  public async routedPackageEnd(): Promise<string> {
    return routedPackageEndOf(await this.read());
  }

  /** The routed links are exactly those of `before` that do not end on `dragged`. */
  public async expectRoutedExceptEndingOn(before: RoutedLink[], dragged: string): Promise<void> {
    const kept = idsNotEndingOn(before, dragged);

    await expect.poll(async (): Promise<string[]> => this.routedIds()).toStrictEqual(kept);
  }

  private async routedIds(): Promise<string[]> {
    const links = await this.routedLinks();

    return links.map((link): string => link.id);
  }

  private async countOf(key: keyof FolderLinkCounts): Promise<number> {
    const counts = await this.counts();

    return counts[key];
  }

  private async read(): Promise<LinkRead> {
    return this.page.evaluate(readLinks);
  }
}
