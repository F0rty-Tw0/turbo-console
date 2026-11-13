import { test } from '@playwright/test';

import { taskCardsPan } from './bench/bench-cards.ts';
import { collectSamples, expectRecorded } from './bench/bench-record.ts';
import { BENCH_ROWS } from './bench/common/bench.const.ts';

test.describe('FEATURE: graph task cards bench', () => {
  test('GIVEN 240 run-marked task nodes framed by Fit, a 2 s pan records the CPU of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => taskCardsPan(browser, false);

    await test.step('WHEN it is panned for 2 s once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.taskCardsPanFit, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.taskCardsPanFit));
  });

  test('GIVEN 240 run-marked task nodes zoomed to a readable 0.8, a 2 s pan records the CPU of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => taskCardsPan(browser, true);

    await test.step('WHEN Controls and Details are closed, it is wheeled in and panned for 2 s once per sample', async (): Promise<
      number[]
    > => collectSamples(BENCH_ROWS.taskCardsPanReadable, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.taskCardsPanReadable));
  });
});
