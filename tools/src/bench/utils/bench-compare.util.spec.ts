import { describe, expect, it } from 'vitest';

import { compareBenches, reduceRuns } from './bench-compare.util.ts';
import type { BenchResult, ComparisonRow, ReducedResult } from '../common/bench.type.ts';

const THRESHOLD = 0.15;

const result = (name: string, medianNs: number, gate: boolean): BenchResult => {
  const benchResult: BenchResult = { name, medianNs, samples: 25, gate };

  return benchResult;
};

const reduced = (name: string, medianNs: number, gate: boolean, middleNs = medianNs): ReducedResult => {
  const reducedResult: ReducedResult = { name, medianNs, middleNs, samples: 25, gate };

  return reducedResult;
};

describe('FEATURE: bench comparison', () => {
  describe('GIVEN three runs of one bench', () => {
    const runs = [[result('core/parse', 30, true)], [result('core/parse', 25, true)], [result('core/parse', 10, true)]];

    it('WHEN the runs are reduced THEN the bench keeps the fastest of its run medians and the middle one', () => {
      const reducedRuns = reduceRuns(runs);

      expect(reducedRuns).toStrictEqual([reduced('core/parse', 10, true, 25)]);
    });
  });

  describe('GIVEN four runs of one bench', () => {
    const runs = [
      [result('core/parse', 40, true)],
      [result('core/parse', 10, true)],
      [result('core/parse', 30, true)],
      [result('core/parse', 15, true)]
    ];

    it('WHEN the runs are reduced THEN the middle is the mean of the two middle run medians', () => {
      const reducedRuns = reduceRuns(runs);

      expect(reducedRuns).toStrictEqual([reduced('core/parse', 10, true, 22.5)]);
    });
  });

  describe('GIVEN runs whose gate changes between runs', () => {
    const runs = [[result('core/parse', 10, false)], [result('core/parse', 10, true)]];

    it('WHEN the runs are reduced THEN the gate comes from the last run', () => {
      const reducedRuns = reduceRuns(runs);

      expect(reducedRuns).toStrictEqual([reduced('core/parse', 10, true)]);
    });
  });

  describe('GIVEN runs with two benches', () => {
    const first = [result('core/a', 1, true), result('core/b', 7, false)];
    const second = [result('core/a', 3, true), result('core/b', 5, false)];

    it('WHEN the runs are reduced THEN each bench is reduced on its own, in first-seen order', () => {
      const reducedRuns = reduceRuns([first, second]);

      expect(reducedRuns).toStrictEqual([reduced('core/a', 1, true, 2), reduced('core/b', 5, false, 6)]);
    });
  });

  describe('GIVEN no runs', () => {
    it('WHEN the runs are reduced THEN there are no results', () => {
      const reducedRuns = reduceRuns([]);

      expect(reducedRuns).toStrictEqual([]);
    });
  });

  describe('GIVEN a gated bench 20% slower on head', () => {
    const base = [reduced('core/parse', 100, true)];
    const head = [reduced('core/parse', 120, true)];

    describe('WHEN the sides are compared', () => {
      it('THEN the comparison fails', () => {
        const comparison = compareBenches(base, head, THRESHOLD);

        expect(comparison.failed).toBe(true);
      });

      it('THEN the row carries both medians, the ratio and the failure', () => {
        const row: ComparisonRow = {
          name: 'core/parse',
          baseNs: 100,
          headNs: 120,
          ratio: 1.2,
          middleRatio: 1.2,
          gate: true,
          failed: true
        };

        const comparison = compareBenches(base, head, THRESHOLD);

        expect(comparison.rows).toStrictEqual([row]);
      });
    });
  });

  describe('GIVEN an ungated bench 20% slower on head', () => {
    it('WHEN the sides are compared THEN the comparison passes', () => {
      const base = [reduced('repo-gen/generate', 100, false)];
      const head = [reduced('repo-gen/generate', 120, false)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });

  describe('GIVEN a gated bench 10% slower on head', () => {
    it('WHEN the sides are compared THEN the comparison passes', () => {
      const base = [reduced('core/parse', 100, true)];
      const head = [reduced('core/parse', 110, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });

  describe('GIVEN a gated bench exactly at the threshold on head', () => {
    it('WHEN base is 100 ns and head 115 ns THEN the comparison passes', () => {
      const base = [reduced('core/parse', 100, true)];
      const head = [reduced('core/parse', 115, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });

    it('WHEN base is 11565000 ns and head 13299750 ns THEN the comparison passes', () => {
      const base = [reduced('core/parse', 11_565_000, true)];
      const head = [reduced('core/parse', 13_299_750, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });

    it('WHEN the fastest is far past it but the middle sits exactly on it THEN the comparison passes', () => {
      const base = [reduced('core/parse', 100, true, 100)];
      const head = [reduced('core/parse', 200, true, 115)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });

    it('WHEN the middle is far past it but the fastest sits exactly on it THEN the comparison passes', () => {
      const base = [reduced('core/parse', 100, true, 100)];
      const head = [reduced('core/parse', 115, true, 200)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });

  describe('GIVEN a gated bench one ns past the threshold on head', () => {
    it('WHEN base is 100 ns and head 116 ns THEN the comparison fails', () => {
      const base = [reduced('core/parse', 100, true)];
      const head = [reduced('core/parse', 116, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(true);
    });

    it('WHEN base is 11565000 ns and head 13299751 ns THEN the comparison fails', () => {
      const base = [reduced('core/parse', 11_565_000, true)];
      const head = [reduced('core/parse', 13_299_751, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(true);
    });
  });

  describe('GIVEN a bench gated on base but ungated on head, 20% slower on head', () => {
    const base = [reduced('core/parse', 100, true)];
    const head = [reduced('core/parse', 120, false)];

    describe('WHEN the sides are compared', () => {
      it('THEN the comparison fails', () => {
        const comparison = compareBenches(base, head, THRESHOLD);

        expect(comparison.failed).toBe(true);
      });

      it('THEN the row is gated', () => {
        const comparison = compareBenches(base, head, THRESHOLD);
        const gates = comparison.rows.map((row) => row.gate);

        expect(gates).toStrictEqual([true]);
      });
    });
  });

  describe('GIVEN a gated bench only on head and another only on base, beside a shared gated bench', () => {
    const base = [reduced('core/old', 100, true), reduced('core/parse', 100, true)];
    const head = [reduced('core/new', 100, true), reduced('core/parse', 100, true)];

    describe('WHEN the sides are compared', () => {
      it('THEN the head-only bench is added and the base-only bench removed', () => {
        const comparison = compareBenches(base, head, THRESHOLD);
        const names = [comparison.added, comparison.removed];

        expect(names).toStrictEqual([['core/new'], ['core/old']]);
      });

      it('THEN the comparison passes with no gated bench missing', () => {
        const comparison = compareBenches(base, head, THRESHOLD);
        const outcome = [comparison.failed, comparison.missingGated];

        expect(outcome).toStrictEqual([false, []]);
      });
    });
  });

  describe('GIVEN base gated benches none of which are on head', () => {
    const base = [reduced('core/a', 100, true), reduced('core/b', 100, true), reduced('repo-gen/generate', 100, false)];
    const head = [reduced('repo-gen/generate', 100, false)];

    describe('WHEN the sides are compared', () => {
      it('THEN the comparison fails', () => {
        const comparison = compareBenches(base, head, THRESHOLD);

        expect(comparison.failed).toBe(true);
      });

      it('THEN the missing gated benches are named', () => {
        const comparison = compareBenches(base, head, THRESHOLD);

        expect(comparison.missingGated).toStrictEqual(['core/a', 'core/b']);
      });
    });

    it('WHEN head has no results THEN the comparison fails', () => {
      const comparison = compareBenches(base, [], THRESHOLD);

      expect(comparison.failed).toBe(true);
    });
  });

  describe('GIVEN base with only ungated benches, none of which are on head', () => {
    it('WHEN the sides are compared THEN the comparison passes', () => {
      const base = [reduced('repo-gen/generate', 100, false)];

      const comparison = compareBenches(base, [], THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });
});
