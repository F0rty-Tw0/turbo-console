import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDetailsBar } from './details-bar.ts';
import { CLEAR_LABEL, CLEAR_TITLE } from '../common/graph.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

describe('FEATURE: buildDetailsBar', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a new Details bar', () => {
    it('WHEN it is built THEN it is a hidden bar of a summary and a disabled icon-only Clear selection', () => {
      const { bar, summary, clear } = buildDetailsBar();

      expect([bar.className, bar.hidden, summary.className]).toStrictEqual(['details-bar', true, 'details-summary']);
      expect([clear.disabled, clear.getAttribute('aria-label'), clear.title]).toStrictEqual([true, CLEAR_LABEL, CLEAR_TITLE]);
      expect(clear.textContent).toBe('');
    });

    it('WHEN it is built THEN the summary comes first, then Clear selection with the clear-all icon', () => {
      const { bar, summary, clear } = buildDetailsBar();

      expect([bar.children[0], bar.children[1]]).toStrictEqual([summary, clear]);
      expect(clear.children[0]?.className).toMatch(/codicon-clear-all/u);
    });
  });
});
