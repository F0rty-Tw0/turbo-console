import { describe, expect, it } from 'vitest';

import { BENCH_PREFIX, ROW_NAME } from './bench.const.ts';
import { STRETCH_ROWS } from './stretch.const.ts';

const ROWS = Object.values(STRETCH_ROWS);

describe('FEATURE: stretch bench rows', () => {
  describe('GIVEN the table', () => {
    it('WHEN its names are listed THEN they are the 5 stretch rows in order', () => {
      const names = ROWS.map((row): string => row.name);

      expect(names).toStrictEqual([
        'graph stretch S task open',
        'graph stretch S pan frame',
        'graph stretch M pan frame',
        'graph stretch M toggle',
        'graph stretch L pan frame'
      ]);
    });

    it('WHEN the gates are listed THEN no row gates', () => {
      expect(ROWS.every((row) => !row.gate)).toBe(true);
    });

    it('WHEN the samples are listed THEN every row takes 3', () => {
      expect(ROWS.every((row) => row.samples === 3)).toBe(true);
    });

    it('WHEN each name is prefixed THEN it is a valid bench name', () => {
      for (const row of ROWS) expect(BENCH_PREFIX + row.name).toMatch(ROW_NAME);
    });
  });
});
