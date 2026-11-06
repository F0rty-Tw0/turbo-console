import { describe, expect, it } from 'vitest';

import { isAnyWord, isPunct, isWord, startOf } from './source-token-match.util.ts';
import { sourceTokensOf } from './source-tokens.util.ts';

describe('FEATURE: matching a source token', () => {
  describe('GIVEN the tokens of import (x)', () => {
    const tokens = sourceTokensOf('import (x)');

    it.each([
      [0, 'import', true],
      [0, 'export', false],
      [1, '(', false],
      [9, 'import', false]
    ])('WHEN isWord asks token %i for %j THEN it is %j', (index, value, expected) => {
      const actual = isWord(tokens[index], value);

      expect(actual).toBe(expected);
    });

    it.each([
      [1, '(', true],
      [1, ')', false],
      [0, 'import', false],
      [9, '(', false]
    ])('WHEN isPunct asks token %i for %j THEN it is %j', (index, value, expected) => {
      const actual = isPunct(tokens[index], value);

      expect(actual).toBe(expected);
    });

    it.each([
      [0, true],
      [1, false],
      [9, false]
    ])('WHEN isAnyWord asks token %i THEN it is %j', (index, expected) => {
      const actual = isAnyWord(tokens[index]);

      expect(actual).toBe(expected);
    });

    it.each([
      [0, 0],
      [1, 7],
      [9, 0]
    ])('WHEN startOf asks token %i THEN it is %i', (index, expected) => {
      const actual = startOf(tokens, index);

      expect(actual).toBe(expected);
    });
  });
});
