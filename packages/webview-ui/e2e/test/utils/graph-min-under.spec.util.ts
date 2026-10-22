import { expect, test } from '@playwright/test';

import type { SampleType } from '../../common/graph.type.ts';

/** Every sample goes to the annotations; the smallest one must be under `ms`, as starvation rarely hits every sample. */
export const expectMinUnder = (type: SampleType, samples: number[], ms: number): void => {
  for (const sample of samples) test.info().annotations.push({ type, description: String(sample) });

  expect(samples).not.toHaveLength(0);
  expect(Math.min(...samples)).toBeLessThan(ms);
};
