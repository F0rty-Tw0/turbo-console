import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { readBoxTitles, titleCrossingsOf } from '../test/utils/graph-title-crossings.spec.util.ts';

/** The titles crossed by a drawn line: how many, and their box ids. */
type TitleCrossings = {
  readonly crossed: number;
  readonly ids: string[];
};

const NONE_CROSSED: TitleCrossings = { crossed: 0, ids: [] };

/** The task mode package box titles the page draws, against the lines it draws. */
export class GraphBoxTitles {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** No drawn line meets the label box of a package box title; a failure lists how many titles are crossed and their ids. */
  public async expectNoTitleCrossed(): Promise<void> {
    await expect.poll(async (): Promise<TitleCrossings> => this.crossings()).toStrictEqual(NONE_CROSSED);
  }

  private async crossings(): Promise<TitleCrossings> {
    const ids = titleCrossingsOf(await readBoxTitles(this.page), await readEdgeLines(this.page));
    const crossings: TitleCrossings = { crossed: ids.length, ids };

    return crossings;
  }
}
