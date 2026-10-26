import { expect, test } from '@playwright/test';

import type { SampleType } from '../../common/graph.type.ts';

/**
 * Every sample goes to the annotations, the log and the failure message; the smallest one must be under `ms`, as
 * starvation rarely hits every sample. The log keeps the samples of green CI runs, which print no annotations. The check
 * is soft, so a failing phase still lets the next phase of the same test log its samples.
 */
export const expectMinUnder = (type: SampleType, samples: number[], ms: number): void => {
  const shown = samples.map((sample: number): string => sample.toFixed(2)).join(', ');

  for (const sample of samples) test.info().annotations.push({ type, description: String(sample) });

  process.stdout.write(`${type}: ${shown} (budget ${ms}) ${test.info().title}\n`);

  expect(samples).not.toHaveLength(0);
  expect.soft(Math.min(...samples), `fastest ${type} of ${shown}`).toBeLessThan(ms);
};
