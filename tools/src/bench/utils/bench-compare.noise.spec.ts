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

  // PR #265 touched no benched code: one of six base runs settled in the fast mode (249 ms, usually 295-387), every head run
  // stayed slow, so the fastest runs differed by 1.19x while the middle runs differed by 1.01x.
  describe('GIVEN one fast base run among slow ones and head runs that are all slow', () => {
    it('WHEN base and head are compared THEN the gate passes', () => {
      const failed = compareRuns([249.285, 310, 330, 340, 360, 387], [295.862, 310, 330, 345, 360, 380]);

      expect(failed).toBe(false);
    });
  });

  describe('GIVEN every head run 20% slower than the base run it pairs with', () => {
    it('WHEN base and head are compared THEN the gate fails', () => {
      const failed = compareRuns([10, 30, 20, 25, 15, 18], [12, 36, 24, 30, 18, 21.6]);

      expect(failed).toBe(true);
    });
  });

  describe('GIVEN head runs whose fastest regressed 1.16x but whose middle is 1.07x', () => {
    it('WHEN base and head are compared THEN the gate passes', () => {
      const failed = compareRuns([100, 110, 120], [116, 118, 119]);

      expect(failed).toBe(false);
    });
  });

  describe('GIVEN head runs whose middle regressed 1.3x but whose fastest did not', () => {
    it('WHEN base and head are compared THEN the gate passes', () => {
      const failed = compareRuns([100, 100, 100], [100, 130, 130]);

      expect(failed).toBe(false);
    });
  });
});
