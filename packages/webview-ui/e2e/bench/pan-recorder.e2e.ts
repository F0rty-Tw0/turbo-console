import type { Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { PanRecorder } from './pan-recorder.ts';
import { p95 } from './utils/bench-stats.util.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';

const BENCH_ORIGIN = 'https://bench.test';
const BLANK_URL = `${BENCH_ORIGIN}/`;
const BENCH_PAGES = `${BENCH_ORIGIN}/**`;

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

const fulfillBlank = async (route: Route): Promise<void> => route.fulfill({ body: '<p>blank</p>', contentType: 'text/html' });

const openBlank = async (page: Page): Promise<void> => {
  await page.route(BENCH_PAGES, fulfillBlank);
  await page.goto(BLANK_URL);
};

const runScript = async (page: Page, script: string): Promise<void> => {
  await page.evaluate(script);
};

const expectLongestTaskAtLeast = async (recorder: PanRecorder, ms: number): Promise<void> => {
  const trace = await recorder.read();

  expect(trace.longestLongTaskMs).toBeGreaterThanOrEqual(ms);
};

const expectNoLongTask = async (recorder: PanRecorder): Promise<void> => {
  const trace = await recorder.read();

  expect(trace.longestLongTaskMs).toBe(0);
};

const expectP95FrameAtLeast = async (recorder: PanRecorder, ms: number): Promise<void> => {
  const trace = await recorder.read();
  const p95Ms = p95(trace.frameDeltasMs);

  expect(p95Ms).toBeGreaterThanOrEqual(ms);
};

test.describe('FEATURE: pan recorder', () => {
  test('GIVEN an 80 ms busy frame that ends just before markOff, the trace counts the long task', async ({ page }): Promise<void> => {
    const recorder = new PanRecorder(page);

    await test.step('WHEN the recorder is installed', async (): Promise<void> => recorder.install());

    await test.step('AND a blank page is opened', async (): Promise<void> => openBlank(page));

    await test.step('AND the pan window opens', async (): Promise<void> => recorder.markOn());

    await test.step('AND an 80 ms busy frame runs', async (): Promise<void> => runScript(page, BUSY_80_MS));

    await test.step('AND the pan window closes', async (): Promise<void> => recorder.markOff());

    await test.step('THEN the longest long task is at least 70 ms', async (): Promise<void> => expectLongestTaskAtLeast(recorder, 70));
  });

  test('GIVEN a busy frame that ended before markOn, the trace counts no long task', async ({ page }): Promise<void> => {
    const recorder = new PanRecorder(page);

    await test.step('WHEN the recorder is installed', async (): Promise<void> => recorder.install());

    await test.step('AND a blank page is opened', async (): Promise<void> => openBlank(page));

    await test.step('AND an 80 ms busy frame runs', async (): Promise<void> => runScript(page, BUSY_80_MS));

    await test.step('AND the pan window opens', async (): Promise<void> => recorder.markOn());

    await test.step('AND a frame passes', async (): Promise<void> => runScript(page, NEXT_FRAME));

    await test.step('AND the pan window closes', async (): Promise<void> => recorder.markOff());

    await test.step('THEN no long task is counted', async (): Promise<void> => expectNoLongTask(recorder));
  });

  test('GIVEN 20 timer tasks of 30 ms each between frames, the p95 frame delta reads the stall', async ({ page }): Promise<void> => {
    const recorder = new PanRecorder(page);

    await test.step('WHEN the recorder is installed', async (): Promise<void> => recorder.install());

    await test.step('AND a blank page is opened', async (): Promise<void> => openBlank(page));

    await test.step('AND the pan window opens', async (): Promise<void> => recorder.markOn());

    await test.step('AND the timer bursts run', async (): Promise<void> => runScript(page, TIMER_BURSTS_30_MS));

    await test.step('AND the pan window closes', async (): Promise<void> => recorder.markOff());

    await test.step('THEN the p95 frame delta is at least 25 ms', async (): Promise<void> => expectP95FrameAtLeast(recorder, 25));
  });
});
