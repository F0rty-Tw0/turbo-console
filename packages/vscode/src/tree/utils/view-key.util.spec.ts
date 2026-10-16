import { describe, expect, it, vi } from 'vitest';

import { viewKeyOf } from './view-key.util.ts';

const live = (...ids: string[]): ReadonlySet<string> => new Set(ids);

const KNOWN = live('a#lint', 'b#lint');

describe('FEATURE: view key', () => {
  describe('GIVEN scripts are shown', () => {
    it('WHEN live ids exist THEN the key is shown and the qualifying ids are not asked', () => {
      const qualifying = vi.fn(() => KNOWN);

      expect(viewKeyOf(qualifying, true, live('a#lint'))).toBe('shown');
      expect(qualifying).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN scripts are hidden', () => {
    it('WHEN nothing is live THEN the key is hidden and the qualifying ids are not asked', () => {
      const qualifying = vi.fn(() => KNOWN);

      expect(viewKeyOf(qualifying, false, live())).toBe('hidden');
      expect(qualifying).not.toHaveBeenCalled();
    });

    it('WHEN a live id qualifies THEN the key lists it after the hidden mark', () => {
      expect(viewKeyOf(() => KNOWN, false, live('a#lint'))).toBe('hidden\0a#lint');
    });

    it('WHEN live ids qualify in any order THEN the key lists them sorted', () => {
      expect(viewKeyOf(() => KNOWN, false, live('b#lint', 'a#lint'))).toBe('hidden\0a#lint\0b#lint');
    });

    it('WHEN a live id does not qualify THEN it is left out', () => {
      expect(viewKeyOf(() => KNOWN, false, live('b#lint', 'x#lint'))).toBe('hidden\0b#lint');
    });

    it('WHEN no live id qualifies THEN the key is hidden', () => {
      expect(viewKeyOf(() => KNOWN, false, live('x#lint'))).toBe('hidden');
    });
  });
});
