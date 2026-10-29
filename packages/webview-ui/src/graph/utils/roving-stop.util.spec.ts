import { describe, expect, it } from 'vitest';

import { kindIn, stopOf } from './roving-stop.util.ts';

type Kind = 'first' | 'second' | 'missing';

type StopCase = { readonly name: string; readonly preferred: Kind; readonly shown: Kind[]; readonly expected: Kind };

const ORDER: Kind[] = ['first', 'second', 'missing'];

const STOP_CASES: StopCase[] = [
  { name: 'the preferred button shows', preferred: 'second', shown: ['first', 'second'], expected: 'second' },
  { name: 'the preferred button is hidden', preferred: 'second', shown: ['first'], expected: 'first' },
  { name: 'nothing shows', preferred: 'second', shown: [], expected: 'missing' }
];

describe('FEATURE: stopOf', () => {
  describe.each(STOP_CASES)('GIVEN $name', ({ preferred, shown, expected }) => {
    it(`WHEN the stop is read THEN it is ${expected}`, () => {
      const stop = stopOf(preferred, shown, 'missing');

      expect(stop).toBe(expected);
    });
  });
});

describe('FEATURE: kindIn', () => {
  const buttons = { first: new EventTarget(), second: new EventTarget(), missing: null };

  describe('GIVEN the second button', () => {
    it('WHEN its kind is read THEN it is second', () => {
      const kind = kindIn(ORDER, buttons, buttons.second);

      expect(kind).toBe('second');
    });
  });

  describe('GIVEN a foreign target', () => {
    it('WHEN its kind is read THEN it is undefined', () => {
      const kind = kindIn(ORDER, buttons, new EventTarget());

      expect(kind).toBeUndefined();
    });
  });

  describe('GIVEN a null target and a missing button', () => {
    it('WHEN its kind is read THEN it is undefined', () => {
      const kind = kindIn(ORDER, buttons, null);

      expect(kind).toBeUndefined();
    });
  });
});
