import { test } from '@playwright/test';

import { coldFirstFrameMs } from './bench/bench-open.ts';
import { targetLikeDefaultPan } from './bench/bench-pan.ts';
import { collectSamples, expectRecorded } from './bench/bench-record.ts';
import { BENCH_ROWS, NOTHING_SAVED } from './bench/common/bench.const.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';

test.describe('FEATURE: graph default first open bench', () => {
  test('GIVEN the target-like graph and nothing saved, a cold open records the first frame of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => coldFirstFrameMs(browser, targetLikeState(), NOTHING_SAVED);

    await test.step('WHEN a fresh page with nothing saved opens it once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.openColdDefault, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.openColdDefault));
  });

  test('GIVEN the target-like graph and nothing saved, a 2 s pan records the CPU of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => targetLikeDefaultPan(browser);

    await test.step('WHEN it opens grouped and is panned for 2 s once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.panCpuDefault, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.panCpuDefault));
  });
});
