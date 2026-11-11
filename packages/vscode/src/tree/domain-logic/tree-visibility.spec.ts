import { describe, expect, it } from 'vitest';

import { TreeVisibility } from './tree-visibility.ts';
import { describedViewOf, visibleViewFake } from '../test/utils/ticker-fakes.spec.util.ts';

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

  describe('GIVEN no view was bound', () => {
    it('WHEN the description is read THEN it is empty', () => {
      const visibility = new TreeVisibility();

      expect(visibility.description()).toBe('');
    });
  });

  describe('GIVEN a bound view with a description', () => {
    it('WHEN the description is read THEN it reads that text', () => {
      const visibility = new TreeVisibility();

      visibility.bind(describedViewOf('affected: task level').view);

      expect(visibility.description()).toBe('affected: task level');
    });
  });

  describe('GIVEN a bound view with no description', () => {
    it('WHEN the description is read THEN it reads empty', () => {
      const visibility = new TreeVisibility();

      visibility.bind(describedViewOf(undefined).view);

      expect(visibility.description()).toBe('');
    });

    it('WHEN a description is set after bind THEN the next read returns the new text', () => {
      const visibility = new TreeVisibility();
      const described = describedViewOf(undefined);

      visibility.bind(described.view);
      described.setDescription('affected: unavailable, see Output');

      expect(visibility.description()).toBe('affected: unavailable, see Output');
    });
  });
});
