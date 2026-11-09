import { format } from 'node:util';

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
  /** Records every `console.warn` line of the test process, still passing each to the real one, and restores it after. */
  resizeStall: async ({ page }, use, testInfo): Promise<void> => {
    const warnings: string[] = [];
    const realWarn = console.warn;

    console.warn = (...args: unknown[]): void => {
      const line = format(...args);

      warnings.push(line);
      realWarn(...args);
    };

    try {
      await use(new ResizeStall(page, testInfo, warnings));
    } finally {
      console.warn = realWarn;
    }
  }
});
