import { describe, expect, it } from 'vitest';

import { TreeVisibility } from './tree-visibility.ts';
import { visibleViewFake } from '../test/utils/ticker-fakes.spec.util.ts';

describe('FEATURE: tree visibility', () => {
  it('GIVEN no view was bound (untrusted workspace) WHEN it is read THEN it is false', () => {
    const visibility = new TreeVisibility();

    expect(visibility.read()).toBe(false);
  });

  describe('GIVEN a bound view', () => {
    it('WHEN the view is shown THEN it reads true', () => {
      const visibility = new TreeVisibility();

      visibility.bind(visibleViewFake(true).view);

      expect(visibility.read()).toBe(true);
    });

    it('WHEN the view later turns hidden THEN it reads the live value, false', () => {
      const visibility = new TreeVisibility();
      const fake = visibleViewFake(true);

      visibility.bind(fake.view);
      fake.setVisible(false);

      expect(visibility.read()).toBe(false);
    });
  });
});
