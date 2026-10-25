import { describe, expect, it } from 'vitest';

import { coveredMs, medianOf } from './timing.spec.util.ts';
import type { TimeRange } from '../common/launch.type.ts';

const WINDOW: TimeRange = { start: 100, end: 200 };

describe('FEATURE: coveredMs', () => {
  describe('GIVEN one range', () => {
    it('WHEN it lies inside the window THEN its whole length counts', () => {
      const ranges: TimeRange[] = [{ start: 120, end: 150 }];

      const covered = coveredMs(ranges, WINDOW);

      expect(covered).toBe(30);
    });

    it('WHEN it starts before the window THEN only the part inside counts', () => {
      const ranges: TimeRange[] = [{ start: 50, end: 130 }];

      const covered = coveredMs(ranges, WINDOW);

      expect(covered).toBe(30);
    });

    it('WHEN it ends after the window THEN only the part inside counts', () => {
      const ranges: TimeRange[] = [{ start: 180, end: 260 }];

      const covered = coveredMs(ranges, WINDOW);

      expect(covered).toBe(20);
    });

    it('WHEN it lies outside the window THEN nothing counts', () => {
      const ranges: TimeRange[] = [{ start: 20, end: 90 }];

      const covered = coveredMs(ranges, WINDOW);

      expect(covered).toBe(0);
    });
  });

  describe('GIVEN two ranges', () => {
    it('WHEN they overlap THEN the overlap counts once', () => {
      const ranges: TimeRange[] = [
        { start: 110, end: 140 },
        { start: 130, end: 160 }
      ];

      const covered = coveredMs(ranges, WINDOW);

      expect(covered).toBe(50);
    });

    it('WHEN one lies inside the other THEN only the outer one counts', () => {
      const ranges: TimeRange[] = [
        { start: 110, end: 170 },
        { start: 120, end: 130 }
      ];

      const covered = coveredMs(ranges, WINDOW);

      expect(covered).toBe(60);
    });

    it('WHEN they are listed out of order THEN both count', () => {
      const ranges: TimeRange[] = [
        { start: 170, end: 180 },
        { start: 110, end: 130 }
      ];

      const covered = coveredMs(ranges, WINDOW);

      expect(covered).toBe(30);
    });
  });

  describe('GIVEN no ranges', () => {
    it('WHEN the window is measured THEN nothing counts', () => {
      const covered = coveredMs([], WINDOW);

      expect(covered).toBe(0);
    });
  });
});

describe('FEATURE: medianOf', () => {
  describe('GIVEN an odd count of values', () => {
    it('WHEN they are out of order THEN the middle value is the median', () => {
      const median = medianOf([9, 1, 5]);

      expect(median).toBe(5);
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
