import { describe, expect, it } from 'vitest';

import { isMenuOpenKey, menuIndexOf } from './menu-keys.util.ts';

describe('FEATURE: menuIndexOf', () => {
  describe('GIVEN a menu of 4 items', () => {
    it.each([
      { key: 'ArrowDown', from: 0, expected: 1 },
      { key: 'ArrowDown', from: 3, expected: 0 },
      { key: 'ArrowUp', from: 2, expected: 1 },
      { key: 'ArrowUp', from: 0, expected: 3 },
      { key: 'Home', from: 2, expected: 0 },
      { key: 'End', from: 1, expected: 3 },
      { key: 'ArrowDown', from: -1, expected: 0 },
      { key: 'ArrowUp', from: -1, expected: 3 }
    ])('WHEN $key is pressed on item $from THEN item $expected is next', ({ key, from, expected }) => {
      const next = menuIndexOf(key, from, 4);

      expect(next).toBe(expected);
    });

    it.each(['Tab', 'a', 'ArrowLeft', 'Enter'])('WHEN %s is pressed THEN it moves nothing', (key) => {
      const next = menuIndexOf(key, 1, 4);

      expect(next).toBeNull();
    });
  });

  it('GIVEN a menu with no items WHEN ArrowDown is pressed THEN it moves nothing', () => {
    const next = menuIndexOf('ArrowDown', -1, 0);

    expect(next).toBeNull();
  });
});

describe('FEATURE: isMenuOpenKey', () => {
  it.each([
    { key: 'F10', isShift: true, expected: true },
    { key: 'ContextMenu', isShift: false, expected: true },
    { key: 'ContextMenu', isShift: true, expected: true },
    { key: 'F10', isShift: false, expected: false },
    { key: 'Enter', isShift: true, expected: false }
  ])('GIVEN $key with Shift $isShift WHEN it is read THEN it opens a menu: $expected', ({ key, isShift, expected }) => {
    const isOpen = isMenuOpenKey(key, isShift);

    expect(isOpen).toBe(expected);
  });
});
