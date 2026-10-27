import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setClearEnabled } from './details-bar.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

type BarPage = Pick<PageElements, 'clear' | 'detailsBar'>;

describe('FEATURE: setClearEnabled', () => {
  let page: BarPage;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = { clear: document.createElement('button'), detailsBar: document.createElement('div') };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN Clear selection and the Details bar', () => {
    it('WHEN it is enabled THEN Clear selection is enabled and the bar shows', () => {
      setClearEnabled(page, true);

      expect([page.clear.disabled, page.detailsBar.hidden]).toStrictEqual([false, false]);
    });

    it('WHEN it is disabled THEN Clear selection is disabled and the bar hides', () => {
      setClearEnabled(page, false);

      expect([page.clear.disabled, page.detailsBar.hidden]).toStrictEqual([true, true]);
    });
  });
});
