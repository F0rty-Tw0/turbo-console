import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';
import type { ProbeEdgeLine } from '../../src/graph/common/graph-probe.type.ts';
import type { ChipSpot, Rgb } from '../common/graph-title-chip.type.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { pixelOfPng, spotUnderTextOf, textRectOf } from '../test/utils/graph-title-chip.spec.util.ts';

/** The pixel a package line leaves under a folder title's text. */
export class GraphTitleChip {
  private readonly page: Page;
  private readonly widgets: GraphWidgetsPage;

  public constructor(page: Page) {
    this.page = page;
    this.widgets = new GraphWidgetsPage(page);
  }

  /** The spot under the folder title's text where a drawn package line crosses; fails when no line runs under the text. */
  public async spotUnderTitle(folder: string): Promise<ChipSpot> {
    const title = this.widgets.rowOf(folder).locator('.widget-title');

    await this.widgets.expectLayerSettledOn(title);
    const isFound = async (): Promise<boolean> => (await this.spotOrNull(folder)) !== null;
    const polled = expect.poll(isFound, { message: `no line under the ${folder} title text` });

    await polled.toBe(true);

    const spot = await this.spotOrNull(folder);

    if (spot === null) throw new Error(`graph e2e: no line under the ${folder} title text`);

    return spot;
  }

  /** The colour on screen at the spot, read from a 1 px screenshot. */
  public async pixelAt(spot: ChipSpot): Promise<Rgb> {
    const clip = { x: spot.x, y: spot.y, width: 1, height: 1 };
    const png = await this.page.screenshot({ clip });

    return this.page.evaluate(pixelOfPng, png.toString('base64'));
  }

  private async spotOrNull(folder: string): Promise<ChipSpot | null> {
    const title = this.widgets.rowOf(folder).locator('.widget-title');
    const rect: ElementRect = await title.evaluate(textRectOf);
    const lines: ProbeEdgeLine[] = await readEdgeLines(this.page);

    return spotUnderTextOf(lines, rect);
  }
}
