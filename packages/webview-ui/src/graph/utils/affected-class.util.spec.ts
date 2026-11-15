import { describe, expect, it } from 'vitest';

import { affectedClassOf } from './affected-class.util.ts';

describe('FEATURE: affected class', () => {
  describe.each([
    ['changed', 'affected-changed'],
    ['dependency', 'affected-dependency']
  ] as const)('GIVEN the mark %s', (mark, name) => {
    it(`WHEN its class is read THEN it is ${name}`, () => {
      expect(affectedClassOf(mark)).toBe(name);
    });
  });
});
