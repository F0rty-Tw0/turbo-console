import { describe, expect, it } from 'vitest';

import { lineAt, linesOf } from './text-line.util.ts';

describe('FEATURE: lineAt', () => {
  describe('GIVEN a text with line breaks', () => {
    it.each([
      ['offset 0', 'a\nb', 0, 0],
      ['after one LF', 'a\nb', 2, 1],
      ['after CR LF, counted once', 'a\r\nb', 3, 1],
      ['after a lone CR', 'a\rb', 2, 1],
      ['after a mix of CR LF, CR and LF', 'a\r\nb\rc\nd', 8, 3],
      ['no break before the offset', 'abc\ndef', 2, 0],
      ['an offset past the end counts every break', 'a\nb\n', 99, 2]
    ])('WHEN the line of %s is read THEN it is %s', (_label, text, offset, expected) => {
      const line = lineAt(text, offset);

      expect(line).toBe(expected);
    });
  });

  describe('GIVEN a text whose lines are listed by lineAt and linesOf', () => {
    const LINES = ['a', '', 'bcd', 'e'];

    it.each([['\n'], ['\r\n'], ['\r']])('WHEN the break is %j THEN every line start maps to its own index in both', (eol) => {
      const text = LINES.join(eol);
      const starts = LINES.map((_line, i): number => LINES.slice(0, i).reduce((sum, row): number => sum + row.length + eol.length, 0));
      const found = starts.map((start): number => lineAt(text, start));
      const rows = linesOf(text);

      expect(found).toStrictEqual([0, 1, 2, 3]);
      expect(rows).toStrictEqual(LINES);
    });
  });
});

describe('FEATURE: linesOf', () => {
  describe('GIVEN a text with line breaks', () => {
    it.each([
      ['one line', 'abc', ['abc']],
      ['LF', 'a\nb', ['a', 'b']],
      ['CR LF counted once', 'a\r\nb', ['a', 'b']],
      ['lone CR', 'a\rb', ['a', 'b']],
      ['a mix', 'a\r\nb\rc\nd', ['a', 'b', 'c', 'd']],
      ['trailing LF', 'a\n', ['a', '']],
      ['trailing CR LF', 'a\r\n', ['a', '']],
      ['empty text', '', ['']],
      ['empty line between', 'a\n\nb', ['a', '', 'b']],
      ['LF then CR is two breaks', 'a\n\rb', ['a', '', 'b']]
    ])('WHEN it has %s THEN the lines are listed without breaks', (_label, text, expected) => {
      const lines = linesOf(text);

      expect(lines).toStrictEqual(expected);
    });
  });
});
