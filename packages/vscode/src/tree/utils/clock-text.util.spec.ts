import { describe, expect, it } from 'vitest';

import { clockOf } from './clock-text.util.ts';

describe('FEATURE: clock text', () => {
  describe('GIVEN a local time', () => {
    it('WHEN 14:05 local THEN "14:05"', () => {
      expect(clockOf(new Date(2026, 10, 11, 14, 5).getTime())).toBe('14:05');
    });

    it('WHEN 09:07 local THEN "09:07" (zero-padded)', () => {
      expect(clockOf(new Date(2026, 10, 11, 9, 7).getTime())).toBe('09:07');
    });
  });
});
