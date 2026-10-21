import type { Page } from '@playwright/test';

import { ONE_FRAME } from '../../common/graph.const.ts';
import type { ViewportPoint } from '../../common/playwright.type.ts';

/** Presses at `spot` and drags one pixel diagonally per frame for `panFrames`, calling `endStep` after the press, each frame and the release. */
export const dragPerFrame = async (
  page: Page,
  spot: ViewportPoint,
  panFrames: number,
  endStep: () => Promise<void>
): Promise<void> => {
  await page.mouse.move(spot.x, spot.y);
  await page.mouse.down();
  await endStep();

  for (let frame = 1; frame <= panFrames; frame += 1) {
    await page.mouse.move(spot.x + frame, spot.y + frame);
    await page.evaluate(ONE_FRAME);
    await endStep();
  }

  await page.mouse.up();
  await endStep();
};
