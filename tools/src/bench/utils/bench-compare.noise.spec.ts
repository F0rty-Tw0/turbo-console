import { describe, expect, it } from 'vitest';

import { compareBenches, reduceRuns } from './bench-compare.util.ts';
import { THRESHOLD } from '../common/bench.const.ts';
import type { BenchResult } from '../common/bench.type.ts';

const runsOf = (name: string, medians: number[]): BenchResult[][] => {
  const runs = medians.map((medianNs) => [{ name, medianNs, samples: 25, gate: true }]);

  return runs;
};

const compareRuns = (baseMedians: number[], headMedians: number[]): boolean => {
  const base = reduceRuns(runsOf('vscode/tree-rows', baseMedians));
  const head = reduceRuns(runsOf('vscode/tree-rows', headMedians));
  const comparison = compareBenches(base, head, THRESHOLD);

  return comparison.failed;
};

// CI saw two of three head processes run a tree-row bench in a stable slow mode (about 1.3x) while the code was unchanged.
describe('FEATURE: the bench gate under per-process noise', () => {
  describe('GIVEN head runs where two of three processes landed in a slow mode', () => {
    it('WHEN base and head are compared THEN the gate passes', () => {
      const failed = compareRuns([10, 10, 10], [10, 15, 15]);

      expect(failed).toBe(false);
    });
  });

  describe('GIVEN head runs that are all 1.3x slower than base, with noise on both sides', () => {
    it('WHEN base and head are compared THEN the gate fails', () => {
      const failed = compareRuns([10, 30, 20], [13, 39, 26]);

      expect(failed).toBe(true);
    });
  });
});
