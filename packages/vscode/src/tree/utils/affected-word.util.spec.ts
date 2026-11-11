import { describe, expect, it } from 'vitest';

import { withAffectedWord } from './affected-word.util.ts';
import type { RowAffected } from '../common/row-affected.type.ts';

const WORDED: RowAffected = { word: 'affected', line: 'Affected (task level): file changed' };

const LIVE: RowAffected = { word: null, line: 'Affected (task level): file changed' };

const CASES: [string, string, RowAffected | null, string][] = [
  ['an empty description and a word', '', WORDED, 'affected'],
  ['a description and a word', 'cached', WORDED, 'cached · affected'],
  ['a description and a null word', 'running · 12s', LIVE, 'running · 12s'],
  ['an empty description and a null word', '', LIVE, ''],
  ['a description and no affected mark', 'cached', null, 'cached'],
  ['an empty description and no affected mark', '', null, '']
];

describe('FEATURE: affected word join', () => {
  describe.each(CASES)('GIVEN %s', (_name, description, affected, expected) => {
    it(`WHEN joined THEN it reads "${expected}"`, () => {
      expect(withAffectedWord(description, affected)).toBe(expected);
    });
  });
});
