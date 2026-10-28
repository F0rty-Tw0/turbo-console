import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { packageView } from './details-package.ts';
import type { PackageDetails } from '../common/details-view.type.ts';
import { START_TRACE_TITLE } from '../common/details.const.ts';
import type { PackageViewModel } from '../common/details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

/** `web`, unfocused, with five tasks and no neighbours. */
const WEB: PackageViewModel = {
  name: 'web',
  path: 'packages/web',
  tags: [],
  taskCount: 5,
  isFocused: false,
  dependencies: [],
  dependents: []
};

const FOCUSED_WEB: PackageViewModel = { ...WEB, isFocused: true };

/** The first child's class, which names the icon, and the last child's text, the label. */
const faceOf = (button: HTMLButtonElement): (string | null | undefined)[] => {
  const children = Array.from(button.children);
  const face = [children[0]?.className, children.at(-1)?.textContent];

  return face;
};

const buttonsOf = (view: PackageDetails): HTMLButtonElement[] => {
  const buttons = [view.openDetails, view.focus, view.exclude, view.startTrace, view.showTasks];

  return buttons;
};

describe('FEATURE: packageView', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an unfocused package with five tasks', () => {
    it('WHEN built THEN each action button draws its D5 icon before its label', () => {
      const view = packageView(WEB, false);
      const faces = buttonsOf(view).map(faceOf);

      expect(faces).toStrictEqual([
        ['codicon codicon-file-text', 'View Package Details · 5 tasks'],
        ['codicon codicon-target', 'Focus'],
        ['codicon codicon-eye-closed', 'Exclude'],
        ['codicon codicon-git-commit', 'Start trace'],
        ['codicon codicon-tasklist', 'Show tasks']
      ]);
    });

    it('WHEN built THEN Start trace keeps its explaining title', () => {
      const view = packageView(WEB, false);

      expect(view.startTrace.title).toBe(START_TRACE_TITLE);
    });

    it('WHEN built THEN Exclude is not aria-disabled', () => {
      const view = packageView(WEB, false);

      expect(view.exclude.getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('GIVEN a focused package', () => {
    it('WHEN built THEN Focus reads Clear focus with the close icon', () => {
      const view = packageView(FOCUSED_WEB, false);
      const face = faceOf(view.focus);

      expect(face).toStrictEqual(['codicon codicon-close', 'Clear focus']);
    });

    it('WHEN built THEN Exclude is aria-disabled', () => {
      const view = packageView(FOCUSED_WEB, false);

      expect(view.exclude.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
