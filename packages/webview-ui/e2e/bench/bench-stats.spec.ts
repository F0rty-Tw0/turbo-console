import { describe, expect, it } from 'vitest';

import { median, p95 } from './bench-stats.ts';

describe('FEATURE: bench stats', () => {
  it('GIVEN an odd count, WHEN the median is taken, THEN the middle value by number order is returned', () => {
    const values = [10, 9, 100];

    const result = median(values);

    expect(result).toBe(10);
  });

  it('GIVEN an even count, WHEN the median is taken, THEN the mean of the two middle values is returned', () => {
    const values = [4, 1, 3, 2];

    const result = median(values);

    expect(result).toBe(2.5);
  });

  it('GIVEN no values, WHEN the median is taken, THEN it throws', () => {
    expect(() => median([])).toThrow('median of no values');
  });

  it('GIVEN the values 1 to 100 shuffled, WHEN p95 is taken, THEN the sample at index 95 of the sorted values is returned', () => {
    const values = Array.from({ length: 100 }, (_, index) => 100 - index);

    const result = p95(values);

    expect(result).toBe(96);
  });

  it('GIVEN 5 values, WHEN p95 is taken, THEN the largest is returned (floor(4.75) = 4)', () => {
    const values = [3, 1, 2, 5, 4];

    const result = p95(values);

    expect(result).toBe(5);
  });

  it('GIVEN one value, WHEN p95 is taken, THEN that value is returned', () => {
    const result = p95([7]);

    expect(result).toBe(7);
  });

  it('GIVEN no values, WHEN p95 is taken, THEN it throws', () => {
    expect(() => p95([])).toThrow('p95 of no values');
  });
});
