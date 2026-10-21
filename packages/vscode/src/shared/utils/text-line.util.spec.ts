import { describe, expect, it } from 'vitest';

import { lineAt } from './text-line.util.ts';

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
});
