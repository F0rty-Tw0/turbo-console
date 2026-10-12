import { describe, expect, it } from 'vitest';

import { plainLine, plainLines } from './plain-text.util.ts';

const INVISIBLE: [string, string][] = [
  ['C1 controls', '\u0080\u0085\u009B\u009F'],
  ['line and paragraph separators', '  '],
  ['bidi embeddings and overrides', '‪‫‬‭‮'],
  ['bidi isolates', '⁦⁧⁨⁩'],
  ['zero-width characters and marks', '​‌‍‎‏'],
  ['the byte order mark', '﻿']
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
