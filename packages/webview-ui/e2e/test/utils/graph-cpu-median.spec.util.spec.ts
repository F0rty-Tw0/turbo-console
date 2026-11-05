import { describe, expect, it } from 'vitest';

import { medianCpuOf } from './graph-cpu-median.spec.util.ts';
import type { CpuSteps } from '../../common/graph.type.ts';

const CALM: CpuSteps = { totalMs: 600, minStepMs: 2, maxStepMs: 20 };

const SPIKED: CpuSteps = { totalMs: 2405, minStepMs: 3, maxStepMs: 110 };

const SLOW: CpuSteps = { totalMs: 900, minStepMs: 1, maxStepMs: 30 };

describe('FEATURE: medianCpuOf', () => {
  describe('GIVEN three runs, one of them spiked', () => {
    it('WHEN the median is taken THEN each field is the middle reading of that field', () => {
      const result = medianCpuOf([SPIKED, CALM, SLOW]);

      expect(result).toStrictEqual({ totalMs: 900, minStepMs: 2, maxStepMs: 30 });
    });
  });

  describe('GIVEN no runs', () => {
    it('WHEN the median is taken THEN it throws', () => {
      expect(() => medianCpuOf([])).toThrow('median of no values');
    });
  });
});
