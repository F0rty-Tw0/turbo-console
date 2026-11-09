import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { ProbeTitle } from '../../src/graph/common/graph-probe-titles.type.ts';
import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { readBoxTitles, titleCrossingsOf } from '../test/utils/graph-title-crossings.spec.util.ts';

/** How far, in model pixels, a framed box may be drawn from its ELK frame and its title from the placeholder (spec AC 2). */
const FRAME_TOLERANCE_PX = 4;

/** The package box titles the probe lists, and the ones a drawn line crosses: how many, and their box ids. */
type TitleCrossings = {
  readonly titles: number;
  readonly crossed: number;
  readonly ids: string[];
};

/** Whether enough boxes are framed, and each framed box drawn further than the tolerance from its frame or placeholder. */
type FrameFit = {
  readonly isFramedEnough: boolean;
  readonly off: string[];
};

const isFramed = (title: ProbeTitle): boolean => title.isFramed;

/** Whether a framed title is drawn within the tolerance of its frame and of its placeholder. */
const isTrue = (title: ProbeTitle): boolean => {
  const frameError = title.frameError ?? Infinity;
  const titleError = title.titleError ?? Infinity;

  return frameError <= FRAME_TOLERANCE_PX && titleError <= FRAME_TOLERANCE_PX;
};

/** A framed title off its frame or placeholder, named with both errors so a failure says by how much. */
const offTextOf = (title: ProbeTitle): string => `${title.id} frame ${title.frameError} title ${title.titleError}`;

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

  /**
   * Every framed box is drawn within 4 px of its ELK frame and its title within 4 px of its placeholder; with
   * `mustFrame`, at least one box is framed, so a view whose titled-row boxes lost their frames fails.
   */
  public async expectFramesTrue(mustFrame: boolean): Promise<void> {
    const fit: FrameFit = { isFramedEnough: true, off: [] };

    await expect.poll(async (): Promise<FrameFit> => this.frameFit(mustFrame)).toStrictEqual(fit);
  }

  private async crossings(): Promise<TitleCrossings> {
    const titles = await readBoxTitles(this.page);
    const ids = titleCrossingsOf(titles, await readEdgeLines(this.page));
    const crossings: TitleCrossings = { titles: titles.length, crossed: ids.length, ids };

    return crossings;
  }

  private async frameFit(mustFrame: boolean): Promise<FrameFit> {
    const titles = await readBoxTitles(this.page);
    const framed = titles.filter(isFramed);
    const isFramedEnough = framed.length > 0 || !mustFrame;
    const offTitles = framed.filter((title): boolean => !isTrue(title));
    const fit: FrameFit = { isFramedEnough, off: offTitles.map(offTextOf) };

    return fit;
  }
}
