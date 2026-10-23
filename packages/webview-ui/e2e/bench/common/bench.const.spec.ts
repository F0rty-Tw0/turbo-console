import { describe, expect, it } from 'vitest';

import { BENCH_PREFIX, BENCH_ROWS, ROW_NAME } from './bench.const.ts';

const SPEC_NAMES = [
  'graph open cold target-like',
  'graph open cached target-like',
  'graph pan cpu target-like',
  'graph pan p95 frame target-like',
  'graph open cold large grouped',
  'graph pan cpu large grouped',
  'graph folder toggle large'
];

const ROWS = Object.values(BENCH_ROWS);

describe('FEATURE: bench rows', () => {
  describe('GIVEN the table', () => {
    it('WHEN its names are listed THEN they are the 7 rows of spec 3.1 in order', () => {
      const names = ROWS.map((row): string => row.name);

      expect(names).toStrictEqual(SPEC_NAMES);
    });
  });

  describe('GIVEN each row', () => {
    it('WHEN its name is prefixed THEN it is a valid bench name', () => {
      for (const row of ROWS) {
        const benchName = BENCH_PREFIX + row.name;

        expect(benchName).toMatch(ROW_NAME);
      }
    });

    it('WHEN its samples are counted THEN it takes at least 3 whole samples', () => {
      for (const row of ROWS) {
        const isWhole = Number.isInteger(row.samples);

        expect(isWhole).toBe(true);
        expect(row.samples).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('GIVEN the table samples', () => {
    it('WHEN they are listed THEN each row keeps its planned count', () => {
      const samples = ROWS.map((row): number => row.samples);

      expect(samples).toStrictEqual([7, 7, 5, 5, 3, 3, 3]);
    });
  });

  describe('GIVEN the three large rows', () => {
    it('WHEN their gates are read THEN none is gated (roadmap Decision 8)', () => {
      const gates = [BENCH_ROWS.openColdLarge.gate, BENCH_ROWS.panCpuLarge.gate, BENCH_ROWS.toggleLarge.gate];

      expect(gates).toStrictEqual([false, false, false]);
    });
  });

  describe('GIVEN the target-like pan rows', () => {
    it('WHEN their samples are compared THEN they match (they are recorded together)', () => {
      expect(BENCH_ROWS.panCpu.samples).toBe(BENCH_ROWS.panP95.samples);
    });
  });
});
