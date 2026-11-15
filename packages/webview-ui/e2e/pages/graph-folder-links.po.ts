import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { FolderLinkCounts, LinkRead } from '../common/graph-folder-links.type.ts';
import { countsOf, isReady, packageEndOf, readLinks } from '../test/utils/graph-folder-links.spec.util.ts';

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

  /** No link's line meets its own label's box. */
  public async expectLabelsOffTheirLines(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.countOf('labelsOnLine')).toBe(0);
  }

  /** Each collapsed end lies outside its node's box shrunk by 3 px times the zoom and inside the box grown by 8 px times the zoom. */
  public async expectCollapsedEndsOnBorder(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.countOf('offBorder')).toBe(0);
  }

  /** The first drawn link's end that is a package; throws when no drawn link ends on one. */
  public async packageEnd(): Promise<string> {
    return packageEndOf(await this.read());
  }

  private async countOf(key: keyof FolderLinkCounts): Promise<number> {
    const counts = await this.counts();

    return counts[key];
  }

  private async read(): Promise<LinkRead> {
    return this.page.evaluate(readLinks);
  }
}
