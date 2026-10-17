import { describe, expect, it } from 'vitest';

import { shapeReasonOf } from './tool-icons-source.util.ts';

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
