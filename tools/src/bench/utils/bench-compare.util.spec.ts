import { describe, expect, it } from 'vitest';

import { compareBenches, formatComparison, reduceRuns } from './bench-compare.util.ts';
import type { BenchComparison, BenchResult, ComparisonRow } from '../common/bench.type.ts';

const THRESHOLD = 0.15;

const result = (name: string, medianNs: number, gate: boolean): BenchResult => {
  const benchResult: BenchResult = { name, medianNs, samples: 25, gate };

  return benchResult;
};

describe('FEATURE: bench comparison', () => {
  describe('GIVEN three runs of one bench', () => {
    const runs = [[result('core/parse', 30, true)], [result('core/parse', 20, true)], [result('core/parse', 10, true)]];

    it('WHEN the runs are reduced THEN the bench keeps the fastest of its run medians', () => {
      const reduced = reduceRuns(runs);

      expect(reduced).toStrictEqual([result('core/parse', 10, true)]);
    });
  });

  describe('GIVEN runs whose gate changes between runs', () => {
    const runs = [[result('core/parse', 10, false)], [result('core/parse', 10, true)]];

    it('WHEN the runs are reduced THEN the gate comes from the last run', () => {
      const reduced = reduceRuns(runs);

      expect(reduced).toStrictEqual([result('core/parse', 10, true)]);
    });
  });

  describe('GIVEN runs with two benches', () => {
    const first = [result('core/a', 1, true), result('core/b', 7, false)];
    const second = [result('core/a', 3, true), result('core/b', 5, false)];

    it('WHEN the runs are reduced THEN each bench is reduced on its own, in first-seen order', () => {
      const reduced = reduceRuns([first, second]);

      expect(reduced).toStrictEqual([result('core/a', 1, true), result('core/b', 5, false)]);
    });
  });

  describe('GIVEN no runs', () => {
    it('WHEN the runs are reduced THEN there are no results', () => {
      const reduced = reduceRuns([]);

      expect(reduced).toStrictEqual([]);
    });
  });

  describe('GIVEN a gated bench 20% slower on head', () => {
    const base = [result('core/parse', 100, true)];
    const head = [result('core/parse', 120, true)];

    describe('WHEN the sides are compared', () => {
      it('THEN the comparison fails', () => {
        const comparison = compareBenches(base, head, THRESHOLD);

        expect(comparison.failed).toBe(true);
      });

      it('THEN the row carries both medians, the ratio and the failure', () => {
        const row: ComparisonRow = { name: 'core/parse', baseNs: 100, headNs: 120, ratio: 1.2, gate: true, failed: true };

        const comparison = compareBenches(base, head, THRESHOLD);

        expect(comparison.rows).toStrictEqual([row]);
      });
    });
  });

  describe('GIVEN an ungated bench 20% slower on head', () => {
    it('WHEN the sides are compared THEN the comparison passes', () => {
      const base = [result('repo-gen/generate', 100, false)];
      const head = [result('repo-gen/generate', 120, false)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });

  describe('GIVEN a gated bench 10% slower on head', () => {
    it('WHEN the sides are compared THEN the comparison passes', () => {
      const base = [result('core/parse', 100, true)];
      const head = [result('core/parse', 110, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });

  describe('GIVEN a gated bench exactly at the threshold on head', () => {
    it('WHEN base is 100 ns and head 115 ns THEN the comparison passes', () => {
      const base = [result('core/parse', 100, true)];
      const head = [result('core/parse', 115, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });

    it('WHEN base is 11565000 ns and head 13299750 ns THEN the comparison passes', () => {
      const base = [result('core/parse', 11_565_000, true)];
      const head = [result('core/parse', 13_299_750, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });

  describe('GIVEN a gated bench one ns past the threshold on head', () => {
    it('WHEN base is 100 ns and head 116 ns THEN the comparison fails', () => {
      const base = [result('core/parse', 100, true)];
      const head = [result('core/parse', 116, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(true);
    });

    it('WHEN base is 11565000 ns and head 13299751 ns THEN the comparison fails', () => {
      const base = [result('core/parse', 11_565_000, true)];
      const head = [result('core/parse', 13_299_751, true)];

      const comparison = compareBenches(base, head, THRESHOLD);

      expect(comparison.failed).toBe(true);
    });
  });

  describe('GIVEN a bench gated on base but ungated on head, 20% slower on head', () => {
    const base = [result('core/parse', 100, true)];
    const head = [result('core/parse', 120, false)];

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
    const base = [result('core/old', 100, true), result('core/parse', 100, true)];
    const head = [result('core/new', 100, true), result('core/parse', 100, true)];

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
    const base = [result('core/a', 100, true), result('core/b', 100, true), result('repo-gen/generate', 100, false)];
    const head = [result('repo-gen/generate', 100, false)];

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
      const base = [result('repo-gen/generate', 100, false)];

      const comparison = compareBenches(base, [], THRESHOLD);

      expect(comparison.failed).toBe(false);
    });
  });

  describe('GIVEN a comparison with a failing row, an added bench and a removed bench', () => {
    const failing: ComparisonRow = { name: 'core/parse', baseNs: 2_000_000, headNs: 2_500_000, ratio: 1.25, gate: true, failed: true };
    const passing: ComparisonRow = {
      name: 'repo-gen/generate',
      baseNs: 1_000_000,
      headNs: 900_000,
      ratio: 0.9,
      gate: false,
      failed: false
    };
    const rows = [failing, passing];
    const comparison: BenchComparison = { rows, added: ['core/new'], removed: ['core/old'], missingGated: [], failed: true };

    describe('WHEN it is formatted', () => {
      it('THEN each row shows its medians in ms, its ratio, its gate and its status', () => {
        const text = formatComparison(comparison);

        expect(text).toMatch(/^core\/parse +2\.000 +2\.500 +1\.250 +gated +FAIL$/m);
      });

      it('THEN an ungated passing row reads ok', () => {
        const text = formatComparison(comparison);

        expect(text).toMatch(/^repo-gen\/generate +1\.000 +0\.900 +0\.900 +- +ok$/m);
      });

      it('THEN added and removed benches are listed', () => {
        const text = formatComparison(comparison);

        expect(text).toMatch(/^added: core\/new\nremoved: core\/old\n/m);
      });

      it('THEN the last line names the failing benches', () => {
        const text = formatComparison(comparison);

        expect(text).toMatch(/\nFAILED: core\/parse regressed past the threshold\n$/);
      });
    });
  });

  describe('GIVEN a passing comparison with nothing added or removed', () => {
    const row: ComparisonRow = { name: 'core/parse', baseNs: 1_000_000, headNs: 1_000_000, ratio: 1, gate: true, failed: false };
    const rows = [row];
    const comparison: BenchComparison = { rows, added: [], removed: [], missingGated: [], failed: false };

    describe('WHEN it is formatted', () => {
      it('THEN the last line says no gated bench regressed', () => {
        const text = formatComparison(comparison);

        expect(text).toMatch(/\nok: no gated bench regressed\n$/);
      });

      it('THEN there are no added or removed lines', () => {
        const text = formatComparison(comparison);

        expect(text).not.toMatch(/^(added|removed):/m);
      });
    });
  });

  describe('GIVEN a comparison whose gated benches are all missing from head', () => {
    const comparison: BenchComparison = {
      rows: [],
      added: [],
      removed: ['core/a', 'core/b'],
      missingGated: ['core/a', 'core/b'],
      failed: true
    };

    it('WHEN it is formatted THEN the last line names the missing gated benches', () => {
      const text = formatComparison(comparison);

      expect(text).toMatch(/\nFAILED: gated benches missing from head: core\/a, core\/b\n$/);
    });
  });
});
