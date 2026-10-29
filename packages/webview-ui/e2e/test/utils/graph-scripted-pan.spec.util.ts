import type { Page } from '@playwright/test';

import { ONE_FRAME } from '../../common/graph.const.ts';
import type { ViewportPoint } from '../../common/playwright.type.ts';

const DRAG_STEPS = 8;

/** Presses at `from`, drags by `dx`, `dy` in eight mouse steps and releases. */
export const dragBy = async (page: Page, from: ViewportPoint, dx: number, dy: number): Promise<void> => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: DRAG_STEPS });
  await page.mouse.up();
};

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
