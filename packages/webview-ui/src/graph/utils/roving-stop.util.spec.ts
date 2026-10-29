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
  it.each(STOP_CASES)('GIVEN $name THEN the stop is $expected', ({ preferred, shown, expected }) => {
    const stop = stopOf(preferred, shown, 'missing');

    expect(stop).toBe(expected);
  });
});

describe('FEATURE: kindIn', () => {
  const buttons = { first: new EventTarget(), second: new EventTarget(), missing: null };

  it('GIVEN the second button WHEN its kind is read THEN it is second', () => {
    const kind = kindIn(ORDER, buttons, buttons.second);

    expect(kind).toBe('second');
  });

  it('GIVEN a foreign target WHEN its kind is read THEN it is undefined', () => {
    const kind = kindIn(ORDER, buttons, new EventTarget());

    expect(kind).toBeUndefined();
  });

  it('GIVEN a null target and a missing button WHEN its kind is read THEN it is undefined', () => {
    const kind = kindIn(ORDER, buttons, null);

    expect(kind).toBeUndefined();
  });
});
