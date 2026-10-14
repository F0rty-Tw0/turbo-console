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
  ['prepended concatenation marks', '\u0600\u0605\u06DD\u070F\u08E2'],
  ['Egyptian hieroglyph format controls', '\u{13430}\u{1343F}'],
  ['lone surrogates, a low one before a high one so they cannot pair', '\uDFFF\uD800'],
  ['tag characters', '\u{E0000}\u{E0041}\u{E007F}'],
  ['other default-ignorable characters (grapheme joiner, Hangul fillers, variation selectors)', '\u034F\u115F\u3164\uFE0F\u180B\uFFA0']
];

const FIRST_SURROGATE = 0xd800;

const LAST_SURROGATE = 0xdfff;

const LAST_CODE_POINT = 0x10ffff;

/**
 * Building and cleaning all 1.1 million code points takes about 0.3 s locally, but it exceeded vitest's 5 s default on
 * the macOS runner while other packages' tests ran beside it.
 */
const EVERY_CODE_POINT_TIMEOUT_MS = 30_000;

const toChar = (code: number): string => String.fromCodePoint(code);

const charsBetween = (from: number, to: number): string => {
  const codes = Array.from({ length: to - from + 1 }, (_, index) => from + index);

  return codes.map(toChar).join('');
};

/** Every code point but the surrogates, which would pair up when joined. */
const everyCodePoint = (): string => {
  const belowSurrogates = charsBetween(0, FIRST_SURROGATE - 1);
  const aboveSurrogates = charsBetween(LAST_SURROGATE + 1, LAST_CODE_POINT);

  return `${belowSurrogates}${aboveSurrogates}`;
};

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

  describe('GIVEN OSC sequences whose text holds a space', () => {
    it.each([
      ['a title ended by BEL', 'a\u001B]0;my title\u0007b', 'ab'],
      ['a hyperlink ended by ST', 'a\u001B]8;;http://x y\u001B\\link\u001B]8;;\u001B\\b', 'alinkb'],
      ['a title ended by 8-bit ST', 'a\u001B]0;my title\u009Cb', 'ab'],
      ['a title aborted by CAN', 'a\u001B]0;my title\u0018b', 'ab'],
      ['a title aborted by SUB', 'a\u001B]0;my title\u001Ab', 'ab'],
      ['a title aborted by a color escape', 'a\u001B]0;my title\u001B[31mb', 'ab'],
      ['a title aborted by an 8-bit color escape', 'a\u001B]0;my title\u009B31mb', 'ab'],
      ['an unterminated title', 'a\u001B]0;my title', 'a'],
    ])('WHEN %s is made plain THEN none of its text is left', (_name, text, plain) => {
      expect(plainLine(text)).toBe(plain);
    });
  });

  describe('GIVEN a terminated OSC whose text holds a newline', () => {
    it('WHEN made plain lines THEN no stray backslash of its terminator shows', () => {
      expect(plainLines('a\u001B]0;t\nfoo\u001B\\bar')).toBe('a\nfoobar');
    });
  });

  describe('GIVEN a stray OSC start followed by more lines', () => {
    it('WHEN made plain lines THEN only the rest of its own line is lost', () => {
      expect(plainLines('error: bad \u001B] in input\nturbo: task failed\nexit 1')).toBe(
        'error: bad \nturbo: task failed\nexit 1'
      );
    });
  });

  describe('GIVEN text with characters that move or hide what a reader sees', () => {
    it.each(INVISIBLE)('WHEN it holds %s THEN plainLines and plainLine drop them', (_, chars) => {
      const text = `a${chars}b\nc`;

      expect(plainLines(text)).toBe('ab\nc');
      expect(plainLine(text)).toBe('abc');
    });
  });

  describe('GIVEN text holding every code point', () => {
    it(
      'WHEN made one plain line THEN no control or default-ignorable character is left',
      { timeout: EVERY_CODE_POINT_TIMEOUT_MS },
      () => {
        const line = plainLine(everyCodePoint());

        const leftovers = line.match(/[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu);

        expect(leftovers).toBeNull();
      }
    );
  });

  describe('GIVEN the two halves of a tag character split by a zero-width space', () => {
    it('WHEN made plain THEN neither half is left to join the other', () => {
      const text = 'ok\uDB40\u200B\uDC69';

      expect(plainLines(text)).toBe('ok');
      expect(plainLine(text)).toBe('ok');
    });
  });

  describe('GIVEN text with printable non-ASCII characters', () => {
    it('WHEN made plain THEN they stay', () => {
      expect(plainLine('täsk-ü  € 名前')).toBe('täsk-ü  € 名前');
    });
  });
});
