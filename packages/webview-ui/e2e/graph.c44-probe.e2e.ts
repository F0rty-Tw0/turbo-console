/* eslint-disable -- C44 probe instrumentation, removed before merge */
import type { Browser } from '@playwright/test';
import { expect, test } from '@playwright/test';

const SPIN_MS = 10;

const READS = 12;

const ROUNDS = 6;

const SPIN = `(() => { const end = performance.now() + ${SPIN_MS}; while (performance.now() < end) {} })()`;

type Read = { readonly wallMs: number; readonly threadMs: number };

/** Reads ThreadTime in a fresh renderer, `READS` times with a 10 ms spin between, after `Performance.enable` in `mode`. */
const readSeries = async (browser: Browser, mode: 'threadTicks' | undefined): Promise<Read[]> => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('data:text/html,<p>probe</p>');

  const session = await context.newCDPSession(page);
  const params = mode === undefined ? {} : { timeDomain: mode };
  const t0 = performance.now();

  await session.send('Performance.enable', params);

  const reads: Read[] = [];

  for (let index = 0; index < READS; index += 1) {
    const { metrics } = await session.send('Performance.getMetrics');
    const thread = metrics.find((metric): boolean => metric.name === 'ThreadTime');

    reads.push({ wallMs: performance.now() - t0, threadMs: (thread?.value ?? Number.NaN) * 1000 });
    await page.evaluate(SPIN);
  }

  await context.close();

  return reads;
};

const format = (reads: Read[]): string =>
  reads.map((read): string => `${read.wallMs.toFixed(0)}:${read.threadMs.toFixed(1)}`).join(' ');

test('C44 probe: ThreadTime in a fresh renderer, default vs threadTicks time domain', async ({ browser }): Promise<void> => {
  const lines: string[] = [];

  for (let round = 0; round < ROUNDS; round += 1) {
    const plain = await readSeries(browser, undefined);
    const ticks = await readSeries(browser, 'threadTicks');

    lines.push(`C44 round ${round} default     ${format(plain)}`);
    lines.push(`C44 round ${round} threadTicks ${format(ticks)}`);
  }

  console.log(lines.join('\n'));
  expect(lines.length).toBe(ROUNDS * 2);
});
