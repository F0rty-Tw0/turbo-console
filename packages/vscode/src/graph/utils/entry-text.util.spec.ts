import { ENTRY_TEXT_MAX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { cutEntryText } from './entry-text.util.ts';

const EMOJI = String.fromCodePoint(0x1f600);

const ELLIPSIS = String.fromCodePoint(0x2026);

const SHOWN = String.fromCodePoint(0xfffd);

const CONTROL_CODES = [0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];

const CONTROL_ROWS = CONTROL_CODES.map((code): [string, number] => [code.toString(16).toUpperCase().padStart(4, '0'), code]);

describe('FEATURE: entry text cut', () => {
  describe('GIVEN a text of at most ENTRY_TEXT_MAX units', () => {
    it.each([
      ['a', 'a'],
      ['200 chars', 's'.repeat(ENTRY_TEXT_MAX)]
    ])('WHEN %s is cut THEN it is kept whole', (_title, text) => {
      const result = cutEntryText(text);

      expect(result).toBe(text);
    });
  });

  describe('GIVEN a text over ENTRY_TEXT_MAX units', () => {
    it('WHEN 201 plain chars are cut THEN it is the first 200 and an ellipsis', () => {
      const result = cutEntryText('s'.repeat(ENTRY_TEXT_MAX + 1));

      expect(result).toBe(`${'s'.repeat(ENTRY_TEXT_MAX)}${ELLIPSIS}`);
    });

    it('WHEN an emoji has its high half at unit 200 THEN it is 199 units and an ellipsis, the pair never split', () => {
      const text = `${'a'.repeat(ENTRY_TEXT_MAX - 1)}${EMOJI}b`;

      const result = cutEntryText(text);

      expect(result).toBe(`${'a'.repeat(ENTRY_TEXT_MAX - 1)}${ELLIPSIS}`);
    });

    it('WHEN an emoji fills units 199 and 200 and text follows THEN the pair is kept and an ellipsis added', () => {
      const text = `${'a'.repeat(ENTRY_TEXT_MAX - 2)}${EMOJI}b`;

      const result = cutEntryText(text);

      expect(result).toBe(`${'a'.repeat(ENTRY_TEXT_MAX - 2)}${EMOJI}${ELLIPSIS}`);
    });
  });

  describe('GIVEN a control character inside a short text', () => {
    it.each(CONTROL_ROWS)('WHEN U+%s is cut THEN it shows as U+FFFD', (_hex, code) => {
      const text = `a${String.fromCodePoint(code)}b`;

      const result = cutEntryText(text);

      expect(result).toBe(`a${SHOWN}b`);
    });
  });
});
