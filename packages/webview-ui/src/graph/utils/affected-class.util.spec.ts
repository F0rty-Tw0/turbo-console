import { describe, expect, it } from 'vitest';

import { affectedClassOf } from './affected-class.util.ts';

describe('FEATURE: affected class', () => {
  it.each([
    ['changed', 'affected-changed'],
    ['dependency', 'affected-dependency']
  ] as const)('GIVEN the mark %s WHEN its class is read THEN it is %s', (mark, name) => {
    expect(affectedClassOf(mark)).toBe(name);
  });
});
