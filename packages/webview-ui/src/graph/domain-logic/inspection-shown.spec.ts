import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showInspectionBar } from './inspection-shown.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { pageMock } from '../test/mocks/page.mock.ts';

const CORE: Inspection = { kind: 'package', name: 'core' };

const CORE_TEXT = 'core · 2 dependencies';

describe('FEATURE: showInspectionBar', () => {
  let page: PageElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = pageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN package mode', () => {
    const isPackageMode = (): boolean => true;

    it('WHEN core is shown THEN the status line and the summary both read its text', () => {
      showInspectionBar({ page, isPackageMode }, CORE, CORE_TEXT);

      expect([page.status.textContent, page.detailsSummary.textContent]).toStrictEqual([CORE_TEXT, CORE_TEXT]);
    });

    it('WHEN core is shown THEN the Details bar shows with Clear selection enabled', () => {
      showInspectionBar({ page, isPackageMode }, CORE, CORE_TEXT);

      expect([page.detailsBar.hidden, page.clear.disabled]).toStrictEqual([false, false]);
    });

    it('WHEN nothing is shown after core THEN the Details bar hides with Clear selection disabled', () => {
      showInspectionBar({ page, isPackageMode }, CORE, CORE_TEXT);
      showInspectionBar({ page, isPackageMode }, NO_INSPECTION, '');

      expect([page.detailsBar.hidden, page.clear.disabled, page.detailsSummary.textContent]).toStrictEqual([true, true, '']);
    });
  });

  it('GIVEN task mode WHEN core is shown THEN nothing is written', () => {
    showInspectionBar({ page, isPackageMode: (): boolean => false }, CORE, CORE_TEXT);

    expect([page.status.textContent, page.detailsSummary.textContent, page.detailsBar.hidden]).toStrictEqual(['', '', true]);
  });
});
