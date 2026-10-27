import { describe, expect, it } from 'vitest';

import { ownerTextOf } from './owner-text.util.ts';

describe('FEATURE: ownerTextOf', () => {
  describe.each([
    ['//', 'single-app', 'single-app'],
    ['//', null, '//'],
    ['@fx/web', null, '@fx/web']
  ])('GIVEN package %s and label %s', (name, label, text) => {
    it('WHEN the owner text is read THEN it is the expected text', () => {
      expect(ownerTextOf(name, label)).toBe(text);
    });
  });
});
