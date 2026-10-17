import { describe, expect, it } from 'vitest';

import { shapeReasonOf, usedIconsOf } from './tool-icons-source.util.ts';

const REASON = 'svg must be one path in a viewBox="0 0 24 24"';

describe('FEATURE: shapeReasonOf', () => {
  describe('GIVEN an svg with one path in a 0 0 24 24 viewBox', () => {
    it('WHEN its shape is checked THEN there is no reason', () => {
      const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>';

      expect(shapeReasonOf(svg)).toBeNull();
    });
  });

  describe('GIVEN an svg with two paths', () => {
    it('WHEN its shape is checked THEN the one-path reason is returned', () => {
      const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/><path d="M1 1h2v2z"/></svg>';

      expect(shapeReasonOf(svg)).toBe(REASON);
    });
  });

  describe('GIVEN an svg with no path', () => {
    it('WHEN its shape is checked THEN the one-path reason is returned', () => {
      const svg = '<svg viewBox="0 0 24 24"><circle r="1"/></svg>';

      expect(shapeReasonOf(svg)).toBe(REASON);
    });
  });

  describe('GIVEN an svg with one path in a 0 0 16 16 viewBox', () => {
    it('WHEN its shape is checked THEN the one-path reason is returned', () => {
      const svg = '<svg viewBox="0 0 16 16"><path d="M0 0h16v16z"/></svg>';

      expect(shapeReasonOf(svg)).toBe(REASON);
    });
  });
});

const VALID = { title: 'Vitest', slug: 'vitest', source: 'https://vitest.dev' };
const BAD_SOURCE = { title: 'Other', slug: 'other', source: 'not a url' };

describe('FEATURE: usedIconsOf', () => {
  describe('GIVEN a valid entry for a used slug', () => {
    it('WHEN the used icons are read THEN the entry is returned by slug', () => {
      const icons = usedIconsOf([VALID], ['vitest']);

      expect(icons.get('vitest')?.source).toBe('https://vitest.dev');
    });
  });

  describe('GIVEN a malformed source on a slug the table does not use', () => {
    it('WHEN the used icons are read THEN it does not fail and the entry is left out', () => {
      const icons = usedIconsOf([VALID, BAD_SOURCE], ['vitest']);

      const slugs = Array.from(icons.keys());

      expect(slugs).toStrictEqual(['vitest']);
    });
  });

  describe('GIVEN the same malformed source on a used slug', () => {
    it('WHEN the used icons are read THEN it throws', () => {
      expect(() => usedIconsOf([VALID, BAD_SOURCE], ['vitest', 'other'])).toThrow();
    });
  });

  describe('GIVEN a malformed guidelines url on a used slug', () => {
    it('WHEN the used icons are read THEN it throws', () => {
      const entry = { ...VALID, guidelines: 'nope' };

      expect(() => usedIconsOf([entry], ['vitest'])).toThrow();
    });
  });
});
