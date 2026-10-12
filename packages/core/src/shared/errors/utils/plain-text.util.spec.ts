import { describe, expect, it } from 'vitest';

import { plainLine, plainLines } from './plain-text.util.ts';

const INVISIBLE: [string, string][] = [
  ['C1 controls', '\u0080\u0085\u009B\u009F'],
  ['line and paragraph separators', '\u2028\u2029'],
  ['bidi embeddings and overrides', '\u202A\u202B\u202C\u202D\u202E'],
  ['bidi isolates', '\u2066\u2067\u2068\u2069'],
  ['zero-width characters and marks', '\u200B\u200C\u200D\u200E\u200F'],
  ['the byte order mark', '\uFEFF'],
  ['the soft hyphen', '\u00AD'],
  ['the Arabic letter mark', '\u061C'],
  ['the Mongolian vowel separator', '\u180E'],
  ['word joiners, invisible operators and deprecated format characters', '\u2060\u2064\u206A\u206F'],
  ['interlinear annotation characters', '\uFFF9\uFFFA\uFFFB'],
  ['tag characters', '\u{E0000}\u{E0041}\u{E007F}']
];

describe('FEATURE: plain text for messages', () => {
  describe('GIVEN text with ANSI escapes, controls, a newline and a tab', () => {
    const text = '\u001B[31ma\u001B[39m\u0000b\u007F\nc\td\u0007';

    it('WHEN made plain lines THEN only the newline and the tab stay', () => {
      expect(plainLines(text)).toBe('ab\nc\td');
    });

    it('WHEN made one plain line THEN the newline and the tab go too', () => {
      expect(plainLine(text)).toBe('abcd');
    });
  });

  describe('GIVEN text with characters that move or hide what a reader sees', () => {
    it.each(INVISIBLE)('WHEN it holds %s THEN plainLines and plainLine drop them', (_, chars) => {
      const text = `a${chars}b\nc`;

      expect(plainLines(text)).toBe('ab\nc');
      expect(plainLine(text)).toBe('abc');
    });
  });

  describe('GIVEN text with printable non-ASCII characters', () => {
    it('WHEN made plain THEN they stay', () => {
      expect(plainLine('täsk-ü  € 名前')).toBe('täsk-ü  € 名前');
    });
  });
});
