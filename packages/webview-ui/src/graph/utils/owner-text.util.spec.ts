import { describe, expect, it } from 'vitest';

import { ownerTextOf } from './owner-text.util.ts';

describe('FEATURE: ownerTextOf', () => {
  it.each([
    ['//', 'single-app', 'single-app'],
    ['//', null, '//'],
    ['@fx/web', null, '@fx/web']
  ])('GIVEN package %s and label %s WHEN the owner text is read THEN it is %s', (name, label, text) => {
    expect(ownerTextOf(name, label)).toBe(text);
  });
});
