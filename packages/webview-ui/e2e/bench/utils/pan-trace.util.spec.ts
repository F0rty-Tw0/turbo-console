import { describe, expect, it } from 'vitest';

import { deltasOf, longestWithin } from './pan-trace.util.ts';

describe('FEATURE: pan trace', () => {
  describe('GIVEN frames 10, 30, 50, 70, 90 and a window 30 to 70', () => {
    it('WHEN deltas are taken THEN the edges count and the rest do not', () => {
      const frames = [10, 30, 50, 70, 90];

      const result = deltasOf(frames, 30, 70);

      expect(result).toStrictEqual([20, 20]);
    });
  });

  describe('GIVEN no frame in the window', () => {
    it('WHEN deltas are taken THEN the list is empty', () => {
      const result = deltasOf([10, 90], 30, 70);

      expect(result).toStrictEqual([]);
    });
  });

  describe('GIVEN tasks before, inside and after the window 10 to 100', () => {
    it('WHEN the longest is taken THEN only the inside ones count', () => {
      const tasks = [
        { startTime: 5, duration: 90 },
        { startTime: 20, duration: 60 },
        { startTime: 40, duration: 70 },
        { startTime: 101, duration: 200 }
      ];

      const result = longestWithin(tasks, 10, 100);

      expect(result).toBe(70);
    });
  });

  describe('GIVEN no task in the window', () => {
    it('WHEN the longest is taken THEN it is 0', () => {
      const result = longestWithin([{ startTime: 5, duration: 90 }], 10, 100);

      expect(result).toBe(0);
    });
  });
});
