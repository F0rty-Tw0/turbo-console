import { describe, expect, it } from 'vitest';

import { isNameOf } from './specifier-name.util.ts';

describe('FEATURE: specifier names a package', () => {
  describe('GIVEN the package name @company/ui', () => {
    it.each([
      ['@company/ui', true],
      ['@company/ui/button', true],
      ['@company/ui-kit', false],
      ['@company', false],
      ['@Company/ui', false]
    ])('WHEN %j is checked THEN isNameOf is %s', (specifier, expected) => {
      expect(isNameOf(specifier, '@company/ui')).toBe(expected);
    });
  });
});
