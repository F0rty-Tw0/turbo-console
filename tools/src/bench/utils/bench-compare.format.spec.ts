import { describe, expect, it } from 'vitest';

import { formatComparison } from './bench-compare.util.ts';
import type { BenchComparison, ComparisonRow } from '../common/bench.type.ts';

describe('FEATURE: bench comparison report', () => {
  describe('GIVEN a comparison with a failing row, an added bench and a removed bench', () => {
    const failing: ComparisonRow = {
      name: 'core/parse',
      baseNs: 2_000_000,
      headNs: 2_500_000,
      ratio: 1.25,
      middleRatio: 1.25,
      gate: true,
      failed: true
    };
    const passing: ComparisonRow = {
      name: 'repo-gen/generate',
      baseNs: 1_000_000,
      headNs: 900_000,
      ratio: 0.9,
      middleRatio: 0.8,
      gate: false,
      failed: false
    };
    const rows = [failing, passing];
    const comparison: BenchComparison = { rows, added: ['core/new'], removed: ['core/old'], missingGated: [], failed: true };

    describe('WHEN it is formatted', () => {
      it('THEN each row shows its medians in ms, both ratios, its gate and its status', () => {
        const text = formatComparison(comparison);

        expect(text).toMatch(/^core\/parse +2\.000 +2\.500 +1\.250 +1\.250 +gated +FAIL$/m);
      });

      it('THEN an ungated passing row reads ok', () => {
        const text = formatComparison(comparison);

        expect(text).toMatch(/^repo-gen\/generate +1\.000 +0\.900 +0\.900 +0\.800 +- +ok$/m);
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
    const row: ComparisonRow = {
      name: 'core/parse',
      baseNs: 1_000_000,
      headNs: 1_000_000,
      ratio: 1,
      middleRatio: 1,
      gate: true,
      failed: false
    };
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
