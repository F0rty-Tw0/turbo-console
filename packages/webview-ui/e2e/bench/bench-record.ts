import { test } from '@playwright/test';

import { sampleAnnotation } from './bench-results.ts';
import type { BenchRowDef } from './common/bench.type.ts';

export const recordSample = (row: BenchRowDef, ms: number): void => {
  const annotation = sampleAnnotation({ name: row.name, ms, gate: row.gate });

  test.info().annotations.push(annotation);
};

/** Runs `measure` once per sample of the row, in sequence, recording each result. */
export const collectSamples = async (row: BenchRowDef, measure: () => Promise<number>): Promise<number[]> => {
  const values: number[] = [];

  for (let sample = 0; sample < row.samples; sample += 1) {
    const ms = await measure();

    recordSample(row, ms);
    values.push(ms);
  }

  return values;
};
