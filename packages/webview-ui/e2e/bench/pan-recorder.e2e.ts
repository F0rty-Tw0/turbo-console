import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { PanRecorder } from './pan-recorder.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';

const BLANK_URL = 'https://bench.test/';

const BUSY_80_MS =
  'new Promise((resolve) => requestAnimationFrame(() => { const end = performance.now() + 80; while (performance.now() < end) { /* busy */ } resolve(); }))';

const openBlank = async (page: Page): Promise<void> => {
  await page.route('https://bench.test/**', async (route): Promise<void> =>
    route.fulfill({ body: '<p>blank</p>', contentType: 'text/html' })
  );
  await page.goto(BLANK_URL);
};

test.describe('FEATURE: pan recorder', () => {
  test('GIVEN an 80 ms busy loop that ends just before markOff, WHEN the trace is read, THEN the long task is counted although the observer delivers it late', async ({
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
});
