import type { Browser } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { largeGroupedOptions, largeGroupedPan, largeToggleMs } from './bench/bench-large.ts';
import { cachedOpen, cachedState, coldFirstFrameMs } from './bench/bench-open.ts';
import { targetLikePan } from './bench/bench-pan.ts';
import { collectSamples, expectRecorded, recordSample } from './bench/bench-record.ts';
import { BENCH_ROWS, LONG_TASK_BUDGET_MS } from './bench/common/bench.const.ts';
import type { PanSample } from './bench/common/bench.type.ts';
import { noteAnnotation } from './bench/utils/bench-results.util.ts';
import { median } from './bench/utils/bench-stats.util.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';

const SAMPLE_COUNT = BENCH_ROWS.panCpu.samples;

const panSamples = async (browser: Browser): Promise<PanSample[]> => {
  const samples: PanSample[] = [];

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const pan = await targetLikePan(browser);

    recordSample(BENCH_ROWS.panCpu, pan.cpuMs);
    recordSample(BENCH_ROWS.panP95, pan.p95Ms);
    samples.push(pan);
  }

  return samples;
};

/** Notes the longest long task of each pan, then checks their median stays within `budgetMs`. */
const expectLongTasksWithin = (samples: PanSample[], budgetMs: number): void => {
  const longest = samples.map((sample): number => sample.longestLongTaskMs);
  const note = noteAnnotation(`long-task-ms ${longest.join(' ')}`);
  const medianMs = median(longest);

  test.info().annotations.push(note);
  expect(medianMs).toBeLessThanOrEqual(budgetMs);
};

test.describe('FEATURE: graph bench', () => {
  test('GIVEN the target-like graph, a cold open records the first frame of every sample', async ({ browser }): Promise<void> => {
    const measure = async (): Promise<number> => coldFirstFrameMs(browser, targetLikeState());

    await test.step('WHEN a fresh page opens it once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.openCold, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.openCold));
  });

  test('GIVEN the target-like graph, a cached open records the first frame of every sample', async ({ browser }): Promise<void> => {
    const cached = await test.step('WHEN a cold open lays it out', async (): Promise<GraphReady> =>
      cachedState(browser, targetLikeState()));

    await test.step('AND a fresh page opens it with those positions once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.openCached, async (): Promise<number> => cachedOpen(browser, cached)));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.openCached));
  });

  test('GIVEN the target-like graph, a 2 s pan records CPU and frame times within the long-task budget', async ({
    browser
  }): Promise<void> => {
    const samples = await test.step('WHEN it is panned for 2 s once per sample', async (): Promise<PanSample[]> =>
      panSamples(browser));

    await test.step('THEN the median longest long task is within budget', (): void =>
      expectLongTasksWithin(samples, LONG_TASK_BUDGET_MS));

    await test.step('AND every CPU sample is recorded', (): void => expectRecorded(BENCH_ROWS.panCpu));

    await test.step('AND every p95 frame sample is recorded', (): void => expectRecorded(BENCH_ROWS.panP95));
  });

  test('GIVEN 300 grouped packages, a cold open records the first frame of every sample', async ({ browser }): Promise<void> => {
    const measure = async (): Promise<number> => coldFirstFrameMs(browser, largeState(), largeGroupedOptions());

    await test.step('WHEN a fresh page opens them once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.openColdLarge, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.openColdLarge));
  });

  test('GIVEN 300 grouped packages, a 2 s pan records the CPU of every sample', async ({ browser }): Promise<void> => {
    const measure = async (): Promise<number> => largeGroupedPan(browser);

    await test.step('WHEN they are panned for 2 s once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.panCpuLarge, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.panCpuLarge));
  });

  test('GIVEN 300 grouped packages, collapsing one folder records the toggle of every sample', async ({ browser }): Promise<void> => {
    const measure = async (): Promise<number> => largeToggleMs(browser);

    await test.step('WHEN one folder is collapsed once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.toggleLarge, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.toggleLarge));
  });
});
