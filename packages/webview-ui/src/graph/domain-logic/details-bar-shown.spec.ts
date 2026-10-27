import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showDetailsBar } from './details-bar-shown.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

type BarPage = Pick<PageElements, 'clear' | 'detailsBar'>;

describe('FEATURE: showDetailsBar', () => {
  let page: BarPage;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = { clear: document.createElement('button'), detailsBar: document.createElement('div') };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN Clear selection and the Details bar', () => {
    it('WHEN it is shown THEN the bar shows and Clear selection is enabled', () => {
      showDetailsBar(page, true);

      expect([page.clear.disabled, page.detailsBar.hidden]).toStrictEqual([false, false]);
    });

    it('WHEN it is hidden THEN the bar hides and Clear selection is disabled', () => {
      showDetailsBar(page, false);

      expect([page.clear.disabled, page.detailsBar.hidden]).toStrictEqual([true, true]);
    });
  });
});
