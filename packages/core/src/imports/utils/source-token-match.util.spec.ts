import { describe, expect, it } from 'vitest';

import { isPunct, isWord } from './source-token-match.util.ts';
import { sourceTokensOf } from './source-tokens.util.ts';

describe('FEATURE: matching a source token', () => {
  describe('GIVEN the tokens of import (x)', () => {
    const tokens = sourceTokensOf('import (x)');

    it.each([
      ['isWord', isWord(tokens[0], 'import'), true],
      ['isWord on another word', isWord(tokens[0], 'export'), false],
      ['isWord on a punctuator', isWord(tokens[1], '('), false],
      ['isPunct', isPunct(tokens[1], '('), true],
      ['isPunct on another punctuator', isPunct(tokens[1], ')'), false],
      ['isPunct on a word', isPunct(tokens[0], 'import'), false],
      ['isPunct past the end', isPunct(tokens[9], '('), false],
      ['isWord past the end', isWord(tokens[9], 'import'), false]
    ])('WHEN %s is asked THEN it is %j', (_name, actual, expected) => {
      expect(actual).toBe(expected);
    });
  });
});
