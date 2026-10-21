import { describe, expect, it } from 'vitest';

import { visibleSelection } from './visible-selection.util.ts';

const VISIBLE = new Set(['core', 'web']);

describe('FEATURE: visibleSelection', () => {
  describe('GIVEN the visible packages core and web', () => {
    it('WHEN nothing is selected THEN no selection is kept', () => {
      const kept = visibleSelection(null, VISIBLE);

      expect(kept).toBeNull();
    });

    it('WHEN web is selected THEN web is kept', () => {
      const kept = visibleSelection('web', VISIBLE);

      expect(kept).toBe('web');
    });

    it('WHEN docs, left out, is selected THEN the selection is dropped', () => {
      const kept = visibleSelection('docs', VISIBLE);

      expect(kept).toBeNull();
    });
  });
});
