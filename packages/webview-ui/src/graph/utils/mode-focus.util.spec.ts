import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { modeFocusOf } from './mode-focus.util.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

type ModePage = Pick<PageElements, 'modeGroup' | 'controls' | 'packagesMode'>;

describe('FEATURE: modeFocusOf', () => {
  let page: ModePage;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = {
      modeGroup: document.createElement('div'),
      controls: document.createElement('button'),
      packagesMode: document.createElement('button')
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the mode group hidden', () => {
    it('WHEN the fallback is read THEN it is Controls', () => {
      page.modeGroup.hidden = true;

      expect(modeFocusOf(page)).toBe(page.controls);
    });
  });

  describe('GIVEN the mode group shown', () => {
    it('WHEN the fallback is read THEN it is Packages', () => {
      expect(modeFocusOf(page)).toBe(page.packagesMode);
    });
  });
});
