import { describe, expect, it } from 'vitest';

import { plainLine, plainLines } from './plain-text.util.ts';

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
});
