import { median } from './stats.spec.util.ts';
import type { CpuSteps } from '../../common/graph.type.ts';

/** The median of each field across `readings`, so one spiked run out of three does not decide a budget; throws on none. */
export const medianCpuOf = (readings: CpuSteps[]): CpuSteps => {
  const totals = readings.map((reading): number => reading.totalMs);
  const minSteps = readings.map((reading): number => reading.minStepMs);
  const maxSteps = readings.map((reading): number => reading.maxStepMs);
  const cpu: CpuSteps = { totalMs: median(totals), minStepMs: median(minSteps), maxStepMs: median(maxSteps) };

  return cpu;
};
