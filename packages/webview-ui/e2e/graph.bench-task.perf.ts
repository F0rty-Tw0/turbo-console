import { test } from '@playwright/test';

import { taskOpen } from './bench/bench-open.ts';
import { taskPan } from './bench/bench-pan.ts';
import { collectSamples, expectRecorded } from './bench/bench-record.ts';
import { BENCH_ROWS } from './bench/common/bench.const.ts';

test.describe('FEATURE: graph task bench', () => {
  test('GIVEN the target-like task graph, a cold open records the first frame of every sample', async ({ browser }): Promise<void> => {
    const measure = async (): Promise<number> => taskOpen(browser);

    await test.step('WHEN a fresh page opens it in task mode once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.taskOpen, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.taskOpen));
  });

  test('GIVEN the target-like task graph, a 2 s pan records the CPU of every sample', async ({ browser }): Promise<void> => {
    const measure = async (): Promise<number> => taskPan(browser);

    await test.step('WHEN it is panned for 2 s once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.taskPanCpu, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.taskPanCpu));
  });
});
