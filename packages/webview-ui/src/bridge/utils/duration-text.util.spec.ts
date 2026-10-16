import { describe, expect, it } from 'vitest';

import { durationText, elapsedText } from './duration-text.util.ts';

describe('FEATURE: duration and elapsed text', () => {
  describe('GIVEN a length in ms', () => {
    it.each([
      [0, '0.0s', '0s'],
      [400, '0.4s', '0s'],
      [999, '0.9s', '0s'],
      [3200, '3.2s', '3s'],
      [12_345, '12.3s', '12s'],
      [59_960, '59.9s', '59s'],
      [59_999, '59.9s', '59s'],
      [60_000, '1m 0s', '1m 0s'],
      [119_999, '1m 59s', '1m 59s'],
      [192_000, '3m 12s', '3m 12s'],
      [3_599_999, '59m 59s', '59m 59s'],
      [3_600_000, '1h 0m 0s', '1h 0m 0s'],
      [3_725_000, '1h 2m 5s', '1h 2m 5s'],
      [90_000_000, '25h 0m 0s', '25h 0m 0s']
    ])('WHEN %d ms is written THEN the duration reads %s and the elapsed time %s', (ms, duration, elapsed) => {
      expect([durationText(ms), elapsedText(ms)]).toStrictEqual([duration, elapsed]);
    });
  });

  describe('GIVEN a length that is not a usable count of ms', () => {
    it.each([
      ['negative', -5],
      ['NaN', Number.NaN],
      ['infinite', Number.POSITIVE_INFINITY],
      ['minus infinite', Number.NEGATIVE_INFINITY]
    ])('WHEN it is %s THEN it counts as 0', (_label, ms) => {
      expect([durationText(ms), elapsedText(ms)]).toStrictEqual(['0.0s', '0s']);
    });
  });
});
