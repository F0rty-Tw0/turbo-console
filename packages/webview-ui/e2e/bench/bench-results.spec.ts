import { describe, expect, it } from 'vitest';

import { resultsOf, sampleAnnotation, sampleOf } from './bench-results.ts';
import type { BenchSample } from './common/bench.type.ts';

const sample = (name: string, ms: number, gate = false): BenchSample => {
  const built: BenchSample = { name, ms, gate };

  return built;
};

describe('FEATURE: bench results', () => {
  describe('GIVEN three samples of one row', () => {
    it('WHEN rows are built THEN medianNs is median ms x 1e6, samples the count, name prefixed', () => {
      const samples = [sample('a', 3), sample('a', 1), sample('a', 2)];

      const rows = resultsOf(samples);

      expect(rows).toStrictEqual([{ name: 'webview-ui/a', medianNs: 2_000_000, samples: 3, gate: false }]);
    });
  });

  describe('GIVEN rows b then a', () => {
    it('WHEN rows are built THEN they keep first-seen order', () => {
      const samples = [sample('b', 1), sample('a', 1), sample('b', 2)];

      const rows = resultsOf(samples);

      expect(rows.map((row) => row.name)).toStrictEqual(['webview-ui/b', 'webview-ui/a']);
    });
  });

  describe('GIVEN an invalid sample', () => {
    it.each([
      ['a\nb', 1],
      ['a+b', 1],
      ['a', 0],
      ['a', -1],
      ['a', Number.NaN],
      ['a', Number.POSITIVE_INFINITY]
    ])('WHEN rows are built for (%s, %s) THEN it throws', (name, ms) => {
      expect(() => resultsOf([sample(name, ms)])).toThrow();
    });
  });

  describe('GIVEN gated samples of one row', () => {
    it('WHEN rows are built THEN the row is gated', () => {
      const samples = [sample('a', 1, true), sample('a', 2, true)];

      const rows = resultsOf(samples);

      expect(rows.map((row) => row.gate)).toStrictEqual([true]);
    });

    it('WHEN the row has one sample THEN the row is gated', () => {
      const rows = resultsOf([sample('a', 1, true)]);

      expect(rows.map((row) => row.gate)).toStrictEqual([true]);
    });
  });

  describe('GIVEN one name with two gate values', () => {
    it('WHEN rows are built THEN it throws naming the row', () => {
      const samples = [sample('a', 1, true), sample('a', 2, false)];

      expect(() => resultsOf(samples)).toThrow('a');
    });
  });

  describe('GIVEN a sample annotation', () => {
    it('WHEN it is read back THEN the sample returns', () => {
      const annotation = sampleAnnotation(sample('a', 2, true));

      const read = sampleOf(annotation);

      expect(read).toStrictEqual(sample('a', 2, true));
    });

    it('WHEN another annotation type is read THEN null returns', () => {
      const read = sampleOf({ type: 'pan-cpu-ms', description: '4' });

      expect(read).toBeNull();
    });

    it('WHEN a bench-sample description is not a sample THEN it throws', () => {
      expect(() => sampleOf({ type: 'bench-sample', description: '{"name":1}' })).toThrow();
    });

    it('WHEN a bench-sample has no description THEN it throws', () => {
      expect(() => sampleOf({ type: 'bench-sample' })).toThrow();
    });
  });
});
