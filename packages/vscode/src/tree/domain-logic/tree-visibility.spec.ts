import { describe, expect, it } from 'vitest';

import { TreeVisibility } from './tree-visibility.ts';
import type { VisibleView } from '../common/visible-view.type.ts';
import { visibleViewFake } from '../test/utils/ticker-fakes.spec.util.ts';

type DescribedView = {
  readonly view: VisibleView;
  readonly setDescription: (description: string | undefined) => void;
};

/** A shown view whose description reads the latest value given to `setDescription`, as a `vscode.TreeView`'s does. */
const describedViewOf = (initial: string | undefined): DescribedView => {
  let current = initial;
  const fake = visibleViewFake(true);
  const view: VisibleView = {
    visible: true,
    onDidChangeVisibility: fake.view.onDidChangeVisibility,
    get description(): string | undefined {
      return current;
    }
  };
  const setDescription = (description: string | undefined): void => {
    current = description;
  };
  const described: DescribedView = { view, setDescription };

  return described;
};

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

  it('GIVEN no view was bound WHEN the description is read THEN it is empty', () => {
    const visibility = new TreeVisibility();

    expect(visibility.description()).toBe('');
  });

  describe('GIVEN a bound view whose description is read', () => {
    it('WHEN the view has a description THEN it reads that text', () => {
      const visibility = new TreeVisibility();

      visibility.bind(describedViewOf('affected: task level').view);

      expect(visibility.description()).toBe('affected: task level');
    });

    it('WHEN the view has no description THEN it reads empty', () => {
      const visibility = new TreeVisibility();

      visibility.bind(describedViewOf(undefined).view);

      expect(visibility.description()).toBe('');
    });

    it('WHEN the description changes after bind THEN the next read returns the new text', () => {
      const visibility = new TreeVisibility();
      const described = describedViewOf(undefined);

      visibility.bind(described.view);
      described.setDescription('affected: unavailable, see Output');

      expect(visibility.description()).toBe('affected: unavailable, see Output');
    });
  });
});
