import { describe, expect, it } from 'vitest';

import { medianOf } from './timing.spec.util.ts';

describe('FEATURE: medianOf', () => {
  describe('GIVEN an odd count of values', () => {
    it('WHEN they are out of order THEN the middle value is the median', () => {
      const median = medianOf([9, 1, 5]);

      expect(median).toBe(5);
    });

    it('WHEN they have different digit counts THEN they are ordered by value, not as text', () => {
      const median = medianOf([10, 9, 2]);

      expect(median).toBe(9);
    });
  });

  describe('GIVEN an even count of values', () => {
    it('WHEN they are out of order THEN the mean of the middle two is the median', () => {
      const median = medianOf([8, 2, 4, 6]);

      expect(median).toBe(5);
    });
  });

  describe('GIVEN no values', () => {
    it('WHEN the median is taken THEN it is NaN', () => {
      const median = medianOf([]);

      expect(median).toBeNaN();
    });
  });
});
