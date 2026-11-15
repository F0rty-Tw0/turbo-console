import { describe, expect, it } from 'vitest';

import { sameOrder } from './same-order.util.ts';

describe('FEATURE: sameOrder', () => {
  describe.each([
    [['a', 'b'], ['a', 'b'], true],
    [[], [], true],
    [['a', 'b'], ['b', 'a'], false],
    [['a'], ['a', 'b'], false],
    [['a', 'b'], ['a'], false]
  ])('GIVEN %j and %j', (left, right, expected) => {
    it(`WHEN compared THEN it is ${expected}`, () => {
      const isSame = sameOrder(left, right);

      expect(isSame).toBe(expected);
    });
  });
});
