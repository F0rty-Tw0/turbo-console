import { describe, expect, it } from 'vitest';

import { bench } from './bench-descriptor.util.ts';
import type { BenchDescriptor } from '../common/bench.type.ts';

describe('FEATURE: bench descriptor', () => {
  describe('GIVEN a name, a function and options', () => {
    it('WHEN bench is called THEN it returns a descriptor holding all three', () => {
      const fn = (): number => 1;
      const expected: BenchDescriptor = { name: 'parse', fn, gate: true };

      const descriptor = bench('parse', fn, { gate: true });

      expect(descriptor).toStrictEqual(expected);
    });
  });
});
