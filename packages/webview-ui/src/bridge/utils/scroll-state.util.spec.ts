import { describe, expect, it } from 'vitest';

import { readScrollY } from './scroll-state.util.ts';

describe('FEATURE: scroll state', () => {
  describe('GIVEN a saved state with a numeric scrollY', () => {
    it('WHEN read THEN it returns that number', () => {
      expect(readScrollY({ scrollY: 120 })).toBe(120);
    });
  });

  describe('GIVEN a state that holds no usable scrollY', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'garbage'],
      ['an object without scrollY', {}],
      ['a non-numeric scrollY', { scrollY: '120' }],
      ['a NaN scrollY', { scrollY: Number.NaN }],
      ['an infinite scrollY', { scrollY: Number.POSITIVE_INFINITY }],
      ['a negative scrollY', { scrollY: -1 }]
    ])('WHEN the state is %s THEN it returns 0', (_label, state) => {
      expect(readScrollY(state)).toBe(0);
    });
  });
});
