import { describe, expect, it } from 'vitest';

import { concurrencyError } from './concurrency-input.util.ts';

const MESSAGE = 'Enter a whole number of at least 1, or a percentage such as 50%.';

describe('FEATURE: validate the Concurrency box', () => {
  describe.each(['1', '4', '10', '50%', '150%', ' 4 ', '\t2\n'])('GIVEN %j', (text) => {
    it('WHEN checked THEN no error (the box trims)', () => {
      expect(concurrencyError(text)).toBeNull();
    });
  });

  describe.each(['0', '-1', 'abc', '1.5', '0%', '', '   ', '01', '4 5', '%', '1%%', '+2'])('GIVEN %j', (text) => {
    it('WHEN checked THEN the message', () => {
      expect(concurrencyError(text)).toBe(MESSAGE);
    });
  });
});
