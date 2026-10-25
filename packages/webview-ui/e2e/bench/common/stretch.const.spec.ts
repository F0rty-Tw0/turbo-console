import { describe, expect, it } from 'vitest';

import { BENCH_PREFIX, BENCH_ROWS, ROW_NAME } from './bench.const.ts';
import type { BenchRowDef } from './bench.type.ts';
import { STRETCH_ROWS } from './stretch.const.ts';

const ROWS = Object.values(STRETCH_ROWS);

const nameOf = (row: BenchRowDef): string => row.name;

describe('FEATURE: stretch bench rows', () => {
  describe('GIVEN the table', () => {
    it('WHEN its names are listed THEN they are the 5 stretch rows in order', () => {
      const names = ROWS.map(nameOf);

      expect(names).toStrictEqual([
        'graph stretch S task open',
        'graph stretch S pan p95 frame',
        'graph stretch M pan p95 frame',
        'graph stretch M toggle',
        'graph stretch L pan p95 frame'
      ]);
    });

    it('WHEN the names are set against the CI bench rows THEN none is shared', () => {
      const stretchNames = new Set(ROWS.map(nameOf));
      const benchNames = Object.values(BENCH_ROWS).map(nameOf);
      const shared = benchNames.filter((name) => stretchNames.has(name));

      expect(shared).toStrictEqual([]);
    });

    it('WHEN each name is prefixed THEN it is a valid bench name', () => {
      for (const row of ROWS) expect(BENCH_PREFIX + row.name).toMatch(ROW_NAME);
    });
  });
});
