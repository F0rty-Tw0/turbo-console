import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { INTERVAL_RECORDER } from '../common/shell.const.ts';

/** How far ahead of the page's own `Date.now()` the pause lands, so the pause is never in the past. */
const PAUSE_AHEAD_MS = 10;

/** One animation frame of the page clock. */
const FRAME_MS = 16;

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

  /** Before the page loads; time runs, so `openTasks` and its frame-driven settle behave as without a clock. */
  public async installRunning(): Promise<void> {
    const start = { time: 0 };

    await this.page.clock.install(start);
  }

  /** Stops time where the page now stands; timers fire only on a `tick` from here on. */
  public async pause(): Promise<void> {
    const now = await this.page.evaluate<number>('Date.now()');

    await this.page.clock.pauseAt(now + PAUSE_AHEAD_MS);
  }

  /** `count` frames of 16 ms, each one a `tick`, so the canvas draws under a paused clock. */
  public async tickFrames(count: number): Promise<void> {
    for (let frame = 0; frame < count; frame += 1) await this.tick(FRAME_MS);
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
