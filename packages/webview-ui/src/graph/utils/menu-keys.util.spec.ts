import { describe, expect, it } from 'vitest';

import { isMenuOpenKey, menuIndexOf, toolbarIndexOf } from './menu-keys.util.ts';

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

describe('FEATURE: toolbarIndexOf', () => {
  describe('GIVEN a toolbar of 4 buttons', () => {
    it.each([
      { key: 'ArrowRight', from: 0, expected: 1 },
      { key: 'ArrowRight', from: 3, expected: 0 },
      { key: 'ArrowLeft', from: 2, expected: 1 },
      { key: 'ArrowLeft', from: 0, expected: 3 },
      { key: 'Home', from: 2, expected: 0 },
      { key: 'End', from: 1, expected: 3 },
      { key: 'ArrowRight', from: -1, expected: 0 },
      { key: 'ArrowLeft', from: -1, expected: 3 }
    ])('WHEN $key is pressed on button $from THEN button $expected is next', ({ key, from, expected }) => {
      const next = toolbarIndexOf(key, from, 4);

      expect(next).toBe(expected);
    });

    it.each(['ArrowDown', 'ArrowUp', 'Tab', 'Enter'])('WHEN %s is pressed THEN it moves nothing', (key) => {
      const next = toolbarIndexOf(key, 1, 4);

      expect(next).toBeNull();
    });
  });

  it('GIVEN a toolbar with no buttons WHEN ArrowRight is pressed THEN it moves nothing', () => {
    const next = toolbarIndexOf('ArrowRight', -1, 0);

    expect(next).toBeNull();
  });
});
