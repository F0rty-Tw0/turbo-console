import { describe, expect, it } from 'vitest';

import { BENCH_ROWS } from './bench.const.ts';

const SPEC_NAMES = [
  'graph open cold target-like',
  'graph open cached target-like',
  'graph pan cpu target-like',
  'graph pan p95 frame target-like',
  'graph open cold large grouped',
  'graph pan cpu large grouped',
  'graph folder toggle large'
];

describe('FEATURE: bench rows', () => {
  it('GIVEN the table, THEN it lists the 7 rows of spec 3.1 in order', () => {
    const names = Object.values(BENCH_ROWS).map((row): string => row.name);

    expect(names).toStrictEqual(SPEC_NAMES);
  });

  it('GIVEN each row, THEN webview-ui/<name> is a valid bench name', () => {
    for (const row of Object.values(BENCH_ROWS)) expect(`webview-ui/${row.name}`).toMatch(/^[\w@./ -]+$/u);
  });

  it('GIVEN the three large rows, THEN none is gated (roadmap Decision 8)', () => {
    const gates = [BENCH_ROWS.openColdLarge.gate, BENCH_ROWS.panCpuLarge.gate, BENCH_ROWS.toggleLarge.gate];

    expect(gates).toStrictEqual([false, false, false]);
  });

  it('GIVEN the target-like pan rows, THEN they take the same samples (they are recorded together)', () => {
    expect(BENCH_ROWS.panCpu.samples).toBe(BENCH_ROWS.panP95.samples);
  });

  it('GIVEN each row, THEN it takes at least 3 whole samples', () => {
    for (const row of Object.values(BENCH_ROWS)) expect(Number.isInteger(row.samples) && row.samples >= 3).toBe(true);
  });
});
