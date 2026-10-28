import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { packageView } from './details-package.ts';
import { START_TRACE_TITLE } from '../common/details.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
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
