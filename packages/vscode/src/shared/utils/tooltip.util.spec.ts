import { describe, expect, it } from 'vitest';

import { tooltipOf } from './tooltip.util.ts';
import { TOOLTIP_LINE_MAX } from '../common/text.const.ts';

describe('FEATURE: tooltip text', () => {
  describe('GIVEN two lines', () => {
    it('WHEN joined THEN each sits on its own line', () => {
      expect(tooltipOf(['line 1', 'line 2'])).toBe('line 1\nline 2');
    });
  });

  describe('GIVEN a line holding a line break of its own', () => {
    it('WHEN joined THEN the break becomes a space, so a line cannot fake another', () => {
      expect(tooltipOf(['a\nb'])).toBe('a b');
    });
  });

  describe('GIVEN a line holding markdown and a link', () => {
    it('WHEN joined THEN it is kept as plain text', () => {
      expect(tooltipOf(['**x** https://example.com [c](command:x) &rlm;'])).toBe('**x** https://example.com [c](command:x) &rlm;');
    });
  });

  describe('GIVEN a line holding a bidi control', () => {
    it('WHEN joined THEN it is cleaned', () => {
      expect(tooltipOf(['a\u202Eb'])).toBe('ab');
    });
  });

  describe('GIVEN a line longer than the tooltip limit', () => {
    it('WHEN joined THEN it is cut to the limit', () => {
      expect(tooltipOf(['a'.repeat(TOOLTIP_LINE_MAX + 50)])).toBe(`${'a'.repeat(TOOLTIP_LINE_MAX - 1)}…`);
    });
  });

  describe('GIVEN no lines', () => {
    it('WHEN joined THEN the tooltip is empty', () => {
      expect(tooltipOf([])).toBe('');
    });
  });
});
