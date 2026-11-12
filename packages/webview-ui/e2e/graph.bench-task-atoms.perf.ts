import { test } from '@playwright/test';

import { taskAtomsPan } from './bench/bench-pan.ts';
import { collectSamples, expectRecorded } from './bench/bench-record.ts';
import { BENCH_ROWS } from './bench/common/bench.const.ts';

test.describe('FEATURE: graph task atoms bench', () => {
  test('GIVEN the target-like task graph with the umbrella chosen, a 2 s pan records the CPU of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => taskAtomsPan(browser, false);

    await test.step('WHEN it is panned for 2 s with the umbrella collapsed once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.taskAtomsPanCpu, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.taskAtomsPanCpu));
  });

  test('GIVEN the target-like task graph with the umbrella chosen and expanded, a 2 s pan records the CPU of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => taskAtomsPan(browser, true);

    await test.step('WHEN the umbrella is double tapped open and it is panned for 2 s once per sample', async (): Promise<number[]> =>
      collectSamples(BENCH_ROWS.taskAtomsExpandedPanCpu, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(BENCH_ROWS.taskAtomsExpandedPanCpu));
  });
});
