import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { layoutScreenOf, showFailure, showStateMessage } from './graph-page-states.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { pageMock } from '../test/mocks/page.mock.ts';

const LOADING_STATE = { kind: 'loading' } as const;

describe('FEATURE: layoutScreenOf', () => {
  let page: PageElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = pageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the Legend popover is open', () => {
    beforeEach(() => {
      page.legendPanel.showPopover();
    });

    it.each([
      ['a loading state', (): void => showStateMessage(page, LOADING_STATE)],
      ['the layout loading', (): void => layoutScreenOf(page).showLoading()],
      ['a page failure', (): void => showFailure(page, new Error('boom'))]
    ])('WHEN %s shows THEN the popover is closed', (_label, show) => {
      show();

      expect(page.legendPanel.matches(':popover-open')).toBe(false);
    });
  });

  describe('GIVEN the pre-state', () => {
    it('WHEN the graph shows THEN the Legend button is enabled', () => {
      layoutScreenOf(page).showGraph(false);

      expect(page.legend.disabled).toBe(false);
    });
  });
});
