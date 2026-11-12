import { describe, expect, it } from 'vitest';

import { concurrencyError } from './concurrency-input.util.ts';

const MESSAGE = 'Enter a whole number of at least 1, or a percentage such as 50%.';

describe('FEATURE: validate the Concurrency box', () => {
  it.each(['1', '4', '10', '50%', '150%', ' 4 ', '\t2\n'])('GIVEN %j WHEN checked THEN no error (the box trims)', (text) => {
    expect(concurrencyError(text)).toBeNull();
  });

  it.each(['0', '-1', 'abc', '1.5', '0%', '', '   ', '01', '4 5', '%', '1%%', '+2'])(
    'GIVEN %j WHEN checked THEN the message',
    (text) => {
      expect(concurrencyError(text)).toBe(MESSAGE);
    }
  );
});
