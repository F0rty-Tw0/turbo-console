import { describe, expect, it } from 'vitest';

import { withAffectedWord } from './affected-word.util.ts';

const CASES: [string, string, string | null, string][] = [
  ['an empty description', '', 'affected', 'affected'],
  ['a description', 'cached', 'affected', 'cached · affected'],
  ['no word', 'running · 12s', null, 'running · 12s'],
  ['nothing at all', '', null, '']
];

describe('FEATURE: affected word join', () => {
  describe.each(CASES)('GIVEN %s', (_name, description, word, expected) => {
    it(`WHEN joined with ${String(word)} THEN it reads "${expected}"`, () => {
      expect(withAffectedWord(description, word)).toBe(expected);
    });
  });
});
