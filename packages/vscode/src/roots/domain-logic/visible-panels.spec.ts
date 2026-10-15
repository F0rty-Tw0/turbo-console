import { beforeEach, describe, expect, it } from 'vitest';

import { VisiblePanels } from './visible-panels.ts';

describe('FEATURE: visible panels', () => {
  describe('GIVEN no panel', () => {
    let panels: VisiblePanels;

    beforeEach(() => {
      panels = new VisiblePanels();
    });

    it('WHEN a root is asked THEN it has none', () => {
      expect(panels.has('/a')).toBe(false);
    });

    it('WHEN a panel turns visible THEN its root has one', () => {
      panels.set('/a', 'p1', true);

      expect(panels.has('/a')).toBe(true);
    });

    it('WHEN a panel turns visible THEN another root has none', () => {
      panels.set('/a', 'p1', true);

      expect(panels.has('/b')).toBe(false);
    });

    it('WHEN a panel that was never visible turns hidden THEN its root has none', () => {
      panels.set('/a', 'p1', false);

      expect(panels.has('/a')).toBe(false);
    });
  });

  describe('GIVEN two visible panels on a root', () => {
    let panels: VisiblePanels;

    beforeEach(() => {
      panels = new VisiblePanels();
      panels.set('/a', 'p1', true);
      panels.set('/a', 'p2', true);
    });

    it('WHEN one turns hidden THEN the root still has one', () => {
      panels.set('/a', 'p1', false);

      expect(panels.has('/a')).toBe(true);
    });

    it('WHEN both turn hidden THEN the root has none', () => {
      panels.set('/a', 'p1', false);
      panels.set('/a', 'p2', false);

      expect(panels.has('/a')).toBe(false);
    });

    it('WHEN only another root is kept THEN the root has none', () => {
      panels.keepOnly(new Set(['/b']));

      expect(panels.has('/a')).toBe(false);
    });

    it('WHEN the root is kept THEN it still has both panels', () => {
      panels.keepOnly(new Set(['/a']));
      panels.set('/a', 'p1', false);

      expect(panels.has('/a')).toBe(true);
    });
  });
});
