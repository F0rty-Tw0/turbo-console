import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { PanRecorder } from './pan-recorder.ts';
import { p95 } from './utils/bench-stats.util.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';

const BLANK_URL = 'https://bench.test/';

const BUSY_80_MS =
  'new Promise((resolve) => requestAnimationFrame(() => { const end = performance.now() + 80; while (performance.now() < end) { /* busy */ } resolve(); }))';

/** 30 ms of work in a timer task between frames, 20 times: the long frame is followed by catch-up frames with stale frame times. */
const TIMER_BURSTS_30_MS = `new Promise((resolve) => {
  let left = 20;
  const burst = () => {
    const end = performance.now() + 30;
    while (performance.now() < end) { /* busy */ }
    left -= 1;
    if (left === 0) { clearInterval(interval); resolve(); }
  };
  const interval = setInterval(burst, 50);
})`;

const openBlank = async (page: Page): Promise<void> => {
  await page.route('https://bench.test/**', async (route): Promise<void> =>
    route.fulfill({ body: '<p>blank</p>', contentType: 'text/html' })
  );
  await page.goto(BLANK_URL);
};

test.describe('FEATURE: pan recorder', () => {
  test('GIVEN an 80 ms busy loop that ends just before markOff, WHEN the trace is read, THEN the long task is counted', async ({
    page
  }) => {
    const recorder = new PanRecorder(page);

    await recorder.install();
    await openBlank(page);
    await recorder.markOn();
    await page.evaluate(BUSY_80_MS);
    await recorder.markOff();

    const trace = await recorder.read();

    expect(trace.longestLongTaskMs).toBeGreaterThanOrEqual(70);
  });

  test('GIVEN a busy loop that ended before markOn, WHEN the trace is read, THEN no long task is counted', async ({ page }) => {
    const recorder = new PanRecorder(page);

    await recorder.install();
    await openBlank(page);
    await page.evaluate(BUSY_80_MS);
    await recorder.markOn();
    await page.evaluate(NEXT_FRAME);
    await recorder.markOff();

    const trace = await recorder.read();

    expect(trace.longestLongTaskMs).toBe(0);
  });

  test('GIVEN 20 timer tasks of 30 ms each between frames, WHEN the trace is read, THEN the p95 frame delta reads the stall', async ({
    page
  }) => {
    const recorder = new PanRecorder(page);

    await recorder.install();
    await openBlank(page);
    await recorder.markOn();
    await page.evaluate(TIMER_BURSTS_30_MS);
    await recorder.markOff();

    const trace = await recorder.read();

    expect(p95(trace.frameDeltasMs)).toBeGreaterThanOrEqual(25);
  });
});
