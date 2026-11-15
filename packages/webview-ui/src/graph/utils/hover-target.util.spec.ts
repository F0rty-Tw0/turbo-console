import { describe, expect, it } from 'vitest';

import { highlightTargetOf } from './hover-target.util.ts';

describe('FEATURE: highlightTargetOf', () => {
  describe.each([
    [null, null, null],
    ['a', null, 'a'],
    [null, 'b', 'b'],
    ['a', 'b', 'b']
  ])('GIVEN selected %s and hovered %s', (selected, hovered, expected) => {
    it(`WHEN the target is read THEN it is ${expected}`, () => {
      expect(highlightTargetOf(selected, hovered)).toBe(expected);
    });
  });
});
