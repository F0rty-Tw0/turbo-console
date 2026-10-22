import { describe, expect, it } from 'vitest';

import { keyedPartsOf } from './keyed-text.util.ts';
import type { KeyedPart } from '../common/details.type.ts';

const plainOf = (text: string): KeyedPart => {
  const part: KeyedPart = { text, isKey: false };

  return part;
};

const keyOf = (text: string): KeyedPart => {
  const part: KeyedPart = { text, isKey: true };

  return part;
};

const ROWS: [string, KeyedPart[]][] = [
  ['press `Enter` on', [plainOf('press '), keyOf('Enter'), plainOf(' on')]],
  ['`Esc` on the graph', [keyOf('Esc'), plainOf(' on the graph')]],
  ['plain', [plainOf('plain')]],
  ['a `b', [plainOf('a `b')]]
];

describe('FEATURE: keyedPartsOf', () => {
  describe('GIVEN copy that marks keys with backticks', () => {
    it.each(ROWS)('WHEN %s is split THEN the parts are its plain text and its keys, none empty', (text, expected) => {
      const parts = keyedPartsOf(text);

      expect(parts).toStrictEqual(expected);
    });
  });
});
