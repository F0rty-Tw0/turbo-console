import { describe, expect, it } from 'vitest';

import { cpuRunsOf } from './graph-thread-time.spec.util.ts';
import type { CpuSteps } from '../../common/graph.type.ts';

const CALM: CpuSteps = { totalMs: 508.6, minStepMs: 1, maxStepMs: 6.2 };

const SPIKED: CpuSteps = { totalMs: 1746.4, minStepMs: 2, maxStepMs: 100.5 };

describe('FEATURE: cpuRunsOf', () => {
  describe('GIVEN two runs', () => {
    it('WHEN they are formatted THEN each run reads as its rounded total/maxStep, comma-separated in run order', () => {
      const result = cpuRunsOf([CALM, SPIKED]);

      expect(result).toBe('509/6,1746/101');
    });
  });

  describe('GIVEN no runs', () => {
    it('WHEN they are formatted THEN the result is empty', () => {
      const result = cpuRunsOf([]);

      expect(result).toBe('');
    });
  });
});
