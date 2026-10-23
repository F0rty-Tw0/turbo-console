import { expect, test } from '@playwright/test';

import type { BenchRowDef } from './common/bench.type.ts';
import { sampleAnnotation, sampleOf } from './utils/bench-results.util.ts';

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

/** The running test recorded every sample of `row`, so the reporter writes it with its full count. */
export const expectRecorded = (row: BenchRowDef): void => {
  const samples = test.info().annotations.map(sampleOf);
  const ofRow = samples.filter((sample): boolean => sample?.name === row.name);

  expect(ofRow).toHaveLength(row.samples);
};
