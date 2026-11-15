import { describe, expect, it } from 'vitest';

import { runningBadgeOf } from './running-badge.util.ts';

describe('FEATURE: running badge value', () => {
  describe('GIVEN no run', () => {
    it('WHEN the badge is read THEN there is none', () => {
      const badge = runningBadgeOf(0);

      expect(badge).toBeUndefined();
    });
  });

  describe.each([1, 2])('GIVEN %i runs', (count) => {
    it('WHEN the badge is read THEN it shows the count and says so', () => {
      const badge = runningBadgeOf(count);

      expect(badge).toStrictEqual({ value: count, tooltip: `${count} running` });
    });
  });
});
