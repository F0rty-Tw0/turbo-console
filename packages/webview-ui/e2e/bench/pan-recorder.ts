/* eslint-disable no-underscore-dangle -- the init script exposes this exact name on window */

import type { Page } from '@playwright/test';

import { NEXT_FRAME } from '../common/graph.const.ts';
import type { PanTrace, RawPanTrace } from './common/bench.type.ts';
import { deltasOf, longestWithin } from './pan-trace.ts';

/** Runs in base and head alike: records every frame and long task, and the window the pan ran in. */
const RECORDER_SCRIPT = `(() => {
  const state = { frames: [], tasks: [], tOn: null, tOff: null };
  const onFrame = (time) => {
    state.frames.push(time);
    requestAnimationFrame(onFrame);
  };
  const onTasks = (list) => {
    for (const entry of list.getEntries()) state.tasks.push({ startTime: entry.startTime, duration: entry.duration });
  };

  requestAnimationFrame(onFrame);
  new PerformanceObserver(onTasks).observe({ type: 'longtask', buffered: true });
  window.__benchPan = {
    markOn: () => {
      state.tOn = performance.now();
      state.tOff = null;
    },
    markOff: () => {
      state.tOff = performance.now();
    },
    read: () => state
  };
})();`;

/** Frame times and long tasks inside a marked window; `install` before the page opens. */
export class PanRecorder {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async install(): Promise<void> {
    await this.page.addInitScript(RECORDER_SCRIPT);
  }

  public async markOn(): Promise<void> {
    await this.page.evaluate((): void => window.__benchPan?.markOn());
  }

  public async markOff(): Promise<void> {
    await this.page.evaluate((): void => window.__benchPan?.markOff());
  }

  /** Waits a frame first: the observer delivers long tasks after they end, so the last ones arrive late. */
  public async read(): Promise<PanTrace> {
    await this.page.evaluate(NEXT_FRAME);

    const raw = await this.page.evaluate((): RawPanTrace | undefined => window.__benchPan?.read());

    if (raw === undefined) throw new Error('pan recorder: the init script did not run, call install before the page opens');

    const { tOn, tOff } = raw;

    if (tOn === null || tOff === null) throw new Error('pan recorder: markOn and markOff must both run before read');

    const trace: PanTrace = { frameDeltasMs: deltasOf(raw.frames, tOn, tOff), longestLongTaskMs: longestWithin(raw.tasks, tOn, tOff) };

    return trace;
  }
}
