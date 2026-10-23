import type { Browser } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { largeGroupedOptions, largeGroupedPan, largeToggleMs } from './bench/bench-large.ts';
import { cachedOpen, coldOpen } from './bench/bench-open.ts';
import { targetLikePan } from './bench/bench-pan.ts';
import { collectSamples, recordSample } from './bench/bench-record.ts';
import { BENCH_ROWS, LONG_TASK_BUDGET_MS } from './bench/common/bench.const.ts';
import type { PanSample } from './bench/common/bench.type.ts';
import { median } from './bench/utils/bench-stats.util.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';

test.use({ trace: 'off' });

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

test.describe('FEATURE: graph bench', () => {
  test('GIVEN the target-like graph, WHEN a fresh page opens it, THEN the first frame is timed', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => {
      const opened = await coldOpen(browser, targetLikeState());

      return opened.firstFrameMs;
    };

    await collectSamples(BENCH_ROWS.openCold, measure);
  });

  test('GIVEN the target-like graph with its positions, WHEN a fresh page opens it, THEN the cached first frame is timed', async ({
    browser
  }): Promise<void> => {
    const { positions } = await coldOpen(browser, targetLikeState());
    const state = targetLikeState();
    const cached = { ...state, positions };
    const measure = async (): Promise<number> => cachedOpen(browser, cached);

    await collectSamples(BENCH_ROWS.openCached, measure);
  });

  test('GIVEN the target-like graph, WHEN it is panned for 2 s, THEN CPU and frame times are timed', async ({
    browser
  }): Promise<void> => {
    const samples = await panSamples(browser);
    const longest = samples.map((sample): number => sample.longestLongTaskMs);
    const note = { type: 'bench-note', description: `long-task-ms ${longest.join(' ')}` };

    test.info().annotations.push(note);
    expect(median(longest)).toBeLessThanOrEqual(LONG_TASK_BUDGET_MS);
  });

  test('GIVEN 300 grouped packages, WHEN a fresh page opens them, THEN the first frame is timed', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => {
      const opened = await coldOpen(browser, largeState(), largeGroupedOptions());

      return opened.firstFrameMs;
    };

    await collectSamples(BENCH_ROWS.openColdLarge, measure);
  });

  test('GIVEN 300 grouped packages, WHEN they are panned for 2 s, THEN the CPU is timed', async ({ browser }): Promise<void> => {
    await collectSamples(BENCH_ROWS.panCpuLarge, async (): Promise<number> => largeGroupedPan(browser));
  });

  test('GIVEN 300 grouped packages, WHEN one folder is collapsed, THEN the toggle is timed', async ({ browser }): Promise<void> => {
    await collectSamples(BENCH_ROWS.toggleLarge, async (): Promise<number> => largeToggleMs(browser));
  });
});
