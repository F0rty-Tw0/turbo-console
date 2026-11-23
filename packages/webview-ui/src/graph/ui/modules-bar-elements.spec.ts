import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildModulesBar } from './modules-bar-elements.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const tagOf = (element: Element): string => element.tagName;

describe('FEATURE: buildModulesBar', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a built bar', () => {
    it('WHEN its parts are read THEN it has the bar id, Back and Refresh', () => {
      const bar = buildModulesBar();

      expect([bar.bar.id, bar.back.textContent, bar.refresh.textContent]).toStrictEqual(['graph-modules-bar', 'Back', 'Refresh']);
    });

    it('WHEN its children are read THEN it holds Back, title, Refresh, status, banner and slow, and no View group', () => {
      const bar = buildModulesBar();

      expect(Array.from(bar.bar.children, tagOf)).toStrictEqual(['BUTTON', 'H2', 'BUTTON', 'P', 'DIV', 'P']);
    });

    it('WHEN the banner, Retry and slow notice are read THEN all three start hidden', () => {
      const bar = buildModulesBar();

      expect([bar.banner.hidden, bar.retry.hidden, bar.slow.hidden]).toStrictEqual([true, true, true]);
    });
  });
});
