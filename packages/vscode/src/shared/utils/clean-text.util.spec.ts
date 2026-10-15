import { describe, expect, it } from 'vitest';

import { cleanLines, cleanText } from './clean-text.util.ts';

const MAX = 120;

describe('FEATURE: cleaning untrusted text', () => {
  describe('GIVEN text holding bidi controls', () => {
    it('WHEN cleaned THEN U+202E and U+2066 are dropped', () => {
      const result = cleanText('a\u202Eb\u2066c', MAX);

      expect(result).toBe('abc');
    });
  });

  describe('GIVEN text holding C0, DEL and C1 controls', () => {
    it('WHEN cleaned THEN U+0007, U+007F and U+009B are dropped', () => {
      const result = cleanText('a\u0007b\u007Fc\u009Bd', MAX);

      expect(result).toBe('abcd');
    });
  });

  describe('GIVEN text holding accents and emoji', () => {
    it('WHEN cleaned THEN they are kept', () => {
      const result = cleanText('café 🚀', MAX);

      expect(result).toBe('café 🚀');
    });
  });

  describe('GIVEN text longer than the limit', () => {
    it('WHEN cleaned THEN it is cut to the limit with an ellipsis', () => {
      const result = cleanText('a'.repeat(200), MAX);

      expect(result).toBe(`${'a'.repeat(MAX - 1)}…`);
    });
  });

  describe('GIVEN text exactly at the limit', () => {
    it('WHEN cleaned THEN it is unchanged', () => {
      const text = 'a'.repeat(MAX);

      expect(cleanText(text, MAX)).toBe(text);
    });
  });

  describe('GIVEN a surrogate pair that straddles the cut', () => {
    it('WHEN cleaned THEN no lone surrogate is left before the ellipsis', () => {
      const text = `${'a'.repeat(MAX - 2)}🚀tail`;

      const result = cleanText(text, MAX);
      const beforeEllipsis = result.slice(0, -1);

      expect(result.endsWith('…')).toBe(true);
      expect(beforeEllipsis).toBe('a'.repeat(MAX - 2));
      expect(/[\uD800-\uDBFF]$/u.test(beforeEllipsis)).toBe(false);
    });
  });

  describe('GIVEN controls that push text over the limit before they are dropped', () => {
    it('WHEN cleaned THEN the limit applies to the cleaned text', () => {
      const text = `${'a'.repeat(MAX)}\u202E`;

      expect(cleanText(text, MAX)).toBe('a'.repeat(MAX));
    });
  });

  describe('GIVEN the first and last code point of each dropped range', () => {
    it.each(['\u0000', '\u001B', '\u007F', '\u009F', '\u202A', '\u202E', '\u2066', '\u2069'])(
      'WHEN %j is cleaned THEN it is dropped',
      (char) => {
        expect(cleanText(`a${char}b`, MAX)).toBe('ab');
      }
    );
  });

  describe('GIVEN the code points just outside the dropped ranges', () => {
    it.each(['~', '\u00A1', '\u00E9'])('WHEN %j is cleaned THEN it is kept', (char) => {
      expect(cleanText(`a${char}b`, MAX)).toBe(`a${char}b`);
    });
  });

  describe('GIVEN invisible characters the plan list does not name', () => {
    it.each(['\u200B', '\u200E', '\u200F', '\u061C', '\uFEFF', '\u{E0041}'])('WHEN %j is cleaned THEN it is dropped', (char) => {
      expect(cleanText(`a${char}b`, MAX)).toBe('ab');
    });
  });

  describe('GIVEN text with line breaks and tabs', () => {
    it('WHEN cleaned THEN each run becomes one space', () => {
      expect(cleanText('one\r\ntwo\tthree\u2028four', MAX)).toBe('one two three four');
    });
  });

  describe('GIVEN text padded with runs of spaces of any kind', () => {
    it('WHEN cleaned THEN each run becomes one space', () => {
      expect(cleanText('test    exit\u3000\u2003\u00A00', MAX)).toBe('test exit 0');
    });
  });

  describe('GIVEN spaces split by dropped characters', () => {
    it.each([
      ['a zero-width space', '\u200B'],
      ['a bell', '\u0007'],
      ['an ANSI escape', '\u001B[0m']
    ])('WHEN the split is %s THEN the spaces still fold into one', (_name, split) => {
      const splitSpace = ` ${split}`;

      expect(cleanText(`a${splitSpace.repeat(30)}b`, MAX)).toBe('a b');
    });
  });

  describe('GIVEN words split by a form feed, vertical tab or next line', () => {
    it('WHEN cleaned THEN each split becomes a space', () => {
      expect(cleanText('exit\f0\vok\u0085done', MAX)).toBe('exit 0 ok done');
    });
  });

  describe('GIVEN words split by separator controls', () => {
    it('WHEN cleaned THEN each split becomes a space', () => {
      expect(cleanText('a\u001Cb\u001Dc\u001Ed\u001Fe', MAX)).toBe('a b c d e');
    });
  });

  describe('GIVEN padding made of braille blanks', () => {
    it('WHEN cleaned THEN it folds into one space', () => {
      expect(cleanText('a \u2800 \u2800 \u2800 b', MAX)).toBe('a b');
    });
  });

  describe('GIVEN a stray OSC start on the first of two lines', () => {
    it('WHEN cleaned THEN the second line still shows', () => {
      expect(cleanText('a\u001B] x\nb', MAX)).toBe('a b');
    });
  });

  describe('GIVEN an ANSI color escape', () => {
    it('WHEN cleaned THEN the whole sequence is dropped', () => {
      expect(cleanText('\u001B[31mred\u001B[0m', MAX)).toBe('red');
    });
  });

  describe('GIVEN lone surrogates', () => {
    it('WHEN cleaned THEN they are dropped and pairs are kept', () => {
      expect(cleanText('a\uD800b\uDC00c\uD83D\uDE80', MAX)).toBe('abc\uD83D\uDE80');
    });
  });

  describe('GIVEN text far longer than the limit', () => {
    it('WHEN only invisible characters fill the read window THEN the cut still shows', () => {
      const text = `${'\u200B'.repeat(MAX * 4)}tail`;

      expect(cleanText(text, MAX)).toBe('\u2026');
    });
  });

  describe('GIVEN a limit below 1', () => {
    it.each([0, -1, Number.NaN])('WHEN the limit is %d THEN the result is empty', (max) => {
      expect(cleanText('abc', max)).toBe('');
    });
  });
});

describe('FEATURE: cleaning untrusted multi-line text', () => {
  describe('GIVEN lines with tabs and a bidi control', () => {
    it('WHEN cleaned THEN newline and tab are kept and the control is dropped', () => {
      expect(cleanLines('one\n\ttwo\u202E', MAX)).toBe('one\n\ttwo');
    });
  });

  describe('GIVEN lines split by CR LF, CR, VT, FF, NEL and the Unicode line separators', () => {
    it('WHEN cleaned THEN each split is a newline, so no two lines join', () => {
      expect(cleanLines('a\r\nb\rc\vd\fe\u0085f\u2028g\u2029h', MAX)).toBe('a\nb\nc\nd\ne\nf\ng\nh');
    });
  });

  describe('GIVEN lines longer than the limit', () => {
    it('WHEN cleaned THEN they are cut with an ellipsis', () => {
      expect(cleanLines(`${'a'.repeat(MAX)}\nb`, MAX)).toBe(`${'a'.repeat(MAX - 1)}\u2026`);
    });
  });
});
