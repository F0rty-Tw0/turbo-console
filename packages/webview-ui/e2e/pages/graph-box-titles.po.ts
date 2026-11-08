import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { readBoxTitles, titleCrossingsOf } from '../test/utils/graph-title-crossings.spec.util.ts';

/** The package box titles the probe lists, and the ones a drawn line crosses: how many, and their box ids. */
type TitleCrossings = {
  readonly titles: number;
  readonly crossed: number;
  readonly ids: string[];
};

/** Whether any of the listed titles is crossed. */
type TitlesCrossed = {
  readonly titles: number;
  readonly isCrossed: boolean;
};

const crossedOf = (crossings: TitleCrossings): TitlesCrossed => {
  const crossed: TitlesCrossed = { titles: crossings.titles, isCrossed: crossings.crossed > 0 };

  return crossed;
};

/** The task mode package box titles the page draws, against the lines it draws. */
export class GraphBoxTitles {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /**
   * The probe lists `titles` package box titles and no drawn line meets the label box of any; a failure lists how many
   * titles are crossed and their ids. The count keeps an empty list (no probe, renamed box class) from passing.
   */
  public async expectNoTitleCrossed(titles: number): Promise<void> {
    const none: TitleCrossings = { titles, crossed: 0, ids: [] };

    await expect.poll(async (): Promise<TitleCrossings> => this.crossings()).toStrictEqual(none);
  }

  /** The probe lists `titles` package box titles and a drawn line meets the label box of at least one. */
  public async expectTitlesCrossed(titles: number): Promise<void> {
    const crossed: TitlesCrossed = { titles, isCrossed: true };

    await expect.poll(async (): Promise<TitlesCrossed> => crossedOf(await this.crossings())).toStrictEqual(crossed);
  }

  private async crossings(): Promise<TitleCrossings> {
    const titles = await readBoxTitles(this.page);
    const ids = titleCrossingsOf(titles, await readEdgeLines(this.page));
    const crossings: TitleCrossings = { titles: titles.length, crossed: ids.length, ids };

    return crossings;
  }
}
