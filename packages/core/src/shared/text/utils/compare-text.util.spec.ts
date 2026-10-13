import { describe, expect, it } from 'vitest';

import { compareText } from './compare-text.util.ts';

describe('FEATURE: text order', () => {
  describe('GIVEN two strings', () => {
    it('WHEN the left one sorts first THEN it is -1', () => {
      expect(compareText('a', 'b')).toBe(-1);
    });

    it('WHEN they are equal THEN it is 0', () => {
      expect(compareText('a', 'a')).toBe(0);
    });

    it('WHEN the left one sorts last THEN it is 1', () => {
      expect(compareText('b', 'a')).toBe(1);
    });
  });

  describe('GIVEN names that differ in case and accents', () => {
    it('WHEN sorted THEN they follow code-unit order, not the locale', () => {
      const names = ['b', 'é', 'B', 'a'];
      const sorted = names.toSorted(compareText);

      expect(sorted).toStrictEqual(['B', 'a', 'b', 'é']);
    });
  });
});
