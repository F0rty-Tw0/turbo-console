import { describe, expect, it } from 'vitest';

import { cardClockText } from './card-clock.util.ts';

describe('FEATURE: card clock text', () => {
  describe('cardClockText', () => {
    it.each([
      [0, '0s'],
      [59_999, '59s'],
      [64_000, '1m 4s'],
      [3_599_999, '59m 59s'],
      [3_600_000, '1h 0m'],
      [359_999_999, '99h 59m'],
      [-5, '0s'],
      [Number.NaN, '0s'],
      [Number.POSITIVE_INFINITY, '0s']
    ])('GIVEN %d ms THEN the clock text is %s', (ms, text) => {
      expect(cardClockText(ms)).toBe(text);
    });
  });
});
