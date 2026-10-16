import { describe, expect, it } from 'vitest';

import { TreeVisibility } from './tree-visibility.ts';
import type { VisibleView } from '../common/visible-view.type.ts';

describe('FEATURE: tree visibility', () => {
  it('GIVEN no view was bound (untrusted workspace) WHEN it is read THEN it is false', () => {
    const visibility = new TreeVisibility();

    expect(visibility.read()).toBe(false);
  });

  describe('GIVEN a bound view', () => {
    it('WHEN the view is shown THEN it reads true', () => {
      const visibility = new TreeVisibility();
      const view: VisibleView = { visible: true };

      visibility.bind(view);

      expect(visibility.read()).toBe(true);
    });

    it('WHEN the view later turns hidden THEN it reads the live value, false', () => {
      const visibility = new TreeVisibility();
      const view = { visible: true };

      visibility.bind(view);
      view.visible = false;

      expect(visibility.read()).toBe(false);
    });
  });
});
