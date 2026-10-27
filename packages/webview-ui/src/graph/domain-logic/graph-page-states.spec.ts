import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { layoutScreenOf } from './graph-page-states.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { pageMock } from '../test/mocks/page.mock.ts';

describe('FEATURE: layoutScreenOf', () => {
  let page: PageElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = pageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the pre-state', () => {
    it('WHEN nothing has shown THEN the Legend button is disabled', () => {
      expect(page.legend.disabled).toBe(true);
    });

    it('WHEN the graph shows THEN the Legend button is enabled', () => {
      layoutScreenOf(page).showGraph(false);

      expect(page.legend.disabled).toBe(false);
    });
  });
});
