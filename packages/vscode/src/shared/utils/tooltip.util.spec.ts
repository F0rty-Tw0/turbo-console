import { describe, expect, it } from 'vitest';

import { tooltipMarkdownOf } from './tooltip.util.ts';
import { TOOLTIP_LINE_MAX } from '../common/text.const.ts';

describe('FEATURE: markdown tooltip text', () => {
  describe('GIVEN a line longer than the tooltip limit', () => {
    it('WHEN joined THEN it is cut to the limit', () => {
      expect(tooltipMarkdownOf(['a'.repeat(TOOLTIP_LINE_MAX + 50)])).toBe(`${'a'.repeat(TOOLTIP_LINE_MAX - 1)}…`);
    });
  });

  describe('GIVEN two lines', () => {
    it('WHEN joined THEN a hard line break ends the first, so each renders on its own line', () => {
      expect(tooltipMarkdownOf(['line 1', 'line 2'])).toBe('line 1\\\nline 2');
    });
  });

  describe('GIVEN a line holding markdown, a link, an autolink, an entity and html', () => {
    it('WHEN joined THEN every ASCII punctuation character is escaped, so it renders as plain text', () => {
      const line = '**x** https://example.com [c](command:x) <a@b.co> &rlm; $(gear)';
      const escaped = String.raw`\*\*x\*\* https\:\/\/example\.com \[c\]\(command\:x\) \<a\@b\.co\> \&rlm\; \$\(gear\)`;

      expect(tooltipMarkdownOf([line])).toBe(escaped);
    });
  });

  describe('GIVEN a line holding a line break and a bidi control', () => {
    it('WHEN joined THEN it is cleaned as a plain tooltip line is', () => {
      expect(tooltipMarkdownOf(['a‮b\nc'])).toBe('ab c');
    });
  });

  describe('GIVEN a trailing line that is empty', () => {
    it('WHEN joined THEN it is dropped, so no hard break is left to render as a backslash', () => {
      expect(tooltipMarkdownOf(['x', ''])).toBe('x');
    });
  });

  describe('GIVEN a middle line that is empty once cleaned', () => {
    it('WHEN joined THEN it is dropped, so the lines around it stay one break apart', () => {
      expect(tooltipMarkdownOf(['x', '​', 'y'])).toBe('x\\\ny');
    });
  });

  describe('GIVEN a trailing line that is only a space', () => {
    it('WHEN joined THEN it is dropped, so no hard break is left to render as a backslash', () => {
      expect(tooltipMarkdownOf(['x', ' '])).toBe('x');
    });
  });

  describe('GIVEN no lines', () => {
    it('WHEN joined THEN the markdown is empty', () => {
      expect(tooltipMarkdownOf([])).toBe('');
    });
  });
});
