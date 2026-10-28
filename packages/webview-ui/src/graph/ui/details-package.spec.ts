import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { packageView } from './details-package.ts';
import { START_TRACE_TITLE } from '../common/details.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { graphIconConstMock } from '../test/mocks/graph-icon-const.mock.ts';
import { SWAPPED_ACTION_ICONS_STUB as SWAPPED } from '../test/stubs/action-icons.stub.ts';
import { FOCUSED_WEB_PACKAGE_STUB, WEB_PACKAGE_STUB } from '../test/stubs/package-view.stub.ts';
import { faceOf, packageButtonsOf } from '../test/utils/button-face.spec.util.ts';

describe('FEATURE: packageView', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an unfocused package with five tasks', () => {
    it('WHEN built THEN each action button draws its D5 icon before its label', () => {
      const view = packageView(WEB_PACKAGE_STUB, false);
      const faces = packageButtonsOf(view).map(faceOf);

      expect(faces).toStrictEqual([
        ['codicon codicon-file-text', 'View Package Details · 5 tasks'],
        ['codicon codicon-target', 'Focus'],
        ['codicon codicon-eye-closed', 'Exclude'],
        ['codicon codicon-git-commit', 'Start trace'],
        ['codicon codicon-tasklist', 'Show tasks']
      ]);
    });

    it('WHEN built THEN Start trace keeps its explaining title', () => {
      const view = packageView(WEB_PACKAGE_STUB, false);

      expect(view.startTrace.title).toBe(START_TRACE_TITLE);
    });

    it('WHEN built THEN Exclude is not aria-disabled', () => {
      const view = packageView(WEB_PACKAGE_STUB, false);

      expect(view.exclude.getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('GIVEN a focused package', () => {
    it('WHEN built THEN Focus reads Clear focus with the close icon', () => {
      const view = packageView(FOCUSED_WEB_PACKAGE_STUB, false);
      const face = faceOf(view.focus);

      expect(face).toStrictEqual(['codicon codicon-close', 'Clear focus']);
    });

    it('WHEN built THEN Exclude is aria-disabled', () => {
      const view = packageView(FOCUSED_WEB_PACKAGE_STUB, false);

      expect(view.exclude.getAttribute('aria-disabled')).toBe('true');
    });
  });
});

describe('FEATURE: packageView icons from the action icon table', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    vi.resetModules();
    vi.doMock('../common/graph-icon.const.ts', (): object => graphIconConstMock(SWAPPED));
  });

  afterEach((): void => {
    vi.doUnmock('../common/graph-icon.const.ts');
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  describe('GIVEN a table where every action draws another icon', () => {
    it.each([
      {
        title: 'an unfocused package',
        model: WEB_PACKAGE_STUB,
        icons: [SWAPPED.openDetails, SWAPPED.focus, SWAPPED.exclude, SWAPPED.startTrace, SWAPPED.showTasks]
      },
      {
        title: 'a focused package',
        model: FOCUSED_WEB_PACKAGE_STUB,
        icons: [SWAPPED.openDetails, SWAPPED.clearFocus, SWAPPED.exclude, SWAPPED.startTrace, SWAPPED.showTasks]
      }
    ])('WHEN the view of $title is built THEN its buttons draw the table icons', async ({ model, icons }) => {
      const swapped = await import('./details-package.ts');
      const view = swapped.packageView(model, false);
      const classes = packageButtonsOf(view).map((button: HTMLButtonElement): string | null | undefined => faceOf(button)[0]);

      expect(classes).toStrictEqual(icons.map((icon: string): string => `codicon codicon-${icon}`));
    });
  });
});
