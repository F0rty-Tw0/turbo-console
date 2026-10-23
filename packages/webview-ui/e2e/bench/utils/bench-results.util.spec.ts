import { describe, expect, it } from 'vitest';

import { noteAnnotation, noteOf, resultsOf, sampleAnnotation, sampleOf } from './bench-results.util.ts';
import type { BenchSample } from '../common/bench.type.ts';
import { BENCH_SAMPLE_STUB } from '../test/stubs/bench.stub.ts';

const GATED: BenchSample = { ...BENCH_SAMPLE_STUB, gate: true };

describe('FEATURE: bench results', () => {
  describe('GIVEN three samples of one row', () => {
    it('WHEN rows are built THEN medianNs is median ms x 1e6, samples the count, name prefixed', () => {
      const samples = [
        { ...BENCH_SAMPLE_STUB, ms: 3 },
        { ...BENCH_SAMPLE_STUB, ms: 1 },
        { ...BENCH_SAMPLE_STUB, ms: 2 }
      ];

      const rows = resultsOf(samples);

      expect(rows).toStrictEqual([{ name: 'webview-ui/a', medianNs: 2_000_000, samples: 3, gate: false }]);
    });
  });

  describe('GIVEN rows b then a', () => {
    it('WHEN rows are built THEN they keep first-seen order', () => {
      const samples = [
        { ...BENCH_SAMPLE_STUB, name: 'b' },
        { ...BENCH_SAMPLE_STUB, name: 'a' },
        { ...BENCH_SAMPLE_STUB, name: 'b', ms: 2 }
      ];

      const rows = resultsOf(samples);
      const names = rows.map((row): string => row.name);

      expect(names).toStrictEqual(['webview-ui/b', 'webview-ui/a']);
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
    ])('WHEN rows are built for (%s, %s) THEN it throws', (name, ms): void => {
      const samples = [{ ...BENCH_SAMPLE_STUB, name, ms }];

      expect(() => resultsOf(samples)).toThrow();
    });
  });

  describe('GIVEN gated samples of one row', () => {
    it('WHEN rows are built THEN the row is gated', () => {
      const samples = [GATED, { ...GATED, ms: 2 }];

      const rows = resultsOf(samples);
      const gates = rows.map((row): boolean => row.gate);

      expect(gates).toStrictEqual([true]);
    });

    it('WHEN the row has one sample THEN the row is gated', () => {
      const rows = resultsOf([GATED]);
      const gates = rows.map((row): boolean => row.gate);

      expect(gates).toStrictEqual([true]);
    });
  });

  describe('GIVEN one name with two gate values', () => {
    it('WHEN rows are built THEN it throws naming the row', () => {
      const samples = [GATED, { ...BENCH_SAMPLE_STUB, ms: 2 }];

      expect(() => resultsOf(samples)).toThrow('webview-ui/a');
    });
  });

  describe('GIVEN a sample annotation', () => {
    it('WHEN it is read back THEN the sample returns', () => {
      const sample: BenchSample = { ...GATED, ms: 2 };
      const annotation = sampleAnnotation(sample);

      const read = sampleOf(annotation);

      expect(read).toStrictEqual(sample);
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

  describe('GIVEN a note annotation', () => {
    it('WHEN it is read back THEN its text returns', () => {
      const annotation = noteAnnotation('long-task-ms 4');

      const read = noteOf(annotation);

      expect(read).toBe('long-task-ms 4');
    });

    it('WHEN it is read as a sample THEN null returns', () => {
      const annotation = noteAnnotation('long-task-ms 4');

      const read = sampleOf(annotation);

      expect(read).toBeNull();
    });

    it('WHEN a sample annotation is read as a note THEN null returns', () => {
      const annotation = sampleAnnotation(BENCH_SAMPLE_STUB);

      const read = noteOf(annotation);

      expect(read).toBeNull();
    });
  });
});
