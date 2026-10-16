import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { INTERVAL_RECORDER } from '../common/shell.const.ts';

/** The page's fake clock: it drives `performance.now()` and the timers, and records the live intervals. */
export class PageClock {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Before the page loads; time then stands still until `tick`, so a page that loads slowly reads the same clock. */
  public async install(): Promise<void> {
    const start = { time: 0 };

    await this.page.clock.install(start);
    await this.page.clock.pauseAt(1000);
    await this.page.addInitScript({ content: INTERVAL_RECORDER });
  }

  /** Moves the clock on by `ms`, firing every timer due on the way. */
  public async tick(ms: number): Promise<void> {
    await this.page.clock.runFor(ms);
  }

  public async expectIntervals(count: number): Promise<void> {
    const liveIntervals = await this.page.evaluate<number>('window.__intervals.size');

    expect(liveIntervals).toBe(count);
  }
}
