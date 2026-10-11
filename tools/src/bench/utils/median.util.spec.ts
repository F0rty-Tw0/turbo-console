import { describe, expect, it } from 'vitest';

import { median } from './median.util.ts';

describe('FEATURE: median', () => {
  describe('GIVEN an odd number of values', () => {
    it('WHEN the median is taken THEN it is the middle value after sorting', () => {
      const result = median([3, 1, 2]);

      expect(result).toBe(2);
    });
  });

  describe('GIVEN an even number of values', () => {
    it('WHEN the median is taken THEN it is the mean of the two middle values', () => {
      const result = median([1, 2, 3, 4]);

      expect(result).toBe(2.5);
    });
  });

  describe('GIVEN one value', () => {
    it('WHEN the median is taken THEN it is that value', () => {
      const result = median([7]);

      expect(result).toBe(7);
    });
  });

  describe('GIVEN unsorted input', () => {
    it('WHEN the median is taken THEN the input keeps its order', () => {
      const values = [10, 30, 20];

      median(values);

      expect(values).toStrictEqual([10, 30, 20]);
    });
  });

  describe('GIVEN no values', () => {
    it('WHEN the median is taken THEN it throws', () => {
      const take = (): number => median([]);

      expect(take).toThrow('median of no values');
    });
  });
});
