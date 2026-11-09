import { test as base } from '@playwright/test';

import { PageClock } from './pages/page-clock.po.ts';
import { ResizeStall } from './pages/resize-stall.po.ts';

type ResizeStallFixtures = {
  readonly pageClock: PageClock;
  readonly resizeStall: ResizeStall;
};

export const test = base.extend<ResizeStallFixtures>({
  pageClock: async ({ page }, use): Promise<void> => {
    await use(new PageClock(page));
  },
  resizeStall: async ({ page }, use, testInfo): Promise<void> => {
    await use(new ResizeStall(page, testInfo));
  }
});
