import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildModulesBar } from './modules-bar-elements.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

describe('FEATURE: buildModulesBar', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a built bar', () => {
    it('WHEN its parts are read THEN it has the bar id, Back, Refresh and the three checked View boxes', () => {
      const bar = buildModulesBar();

      expect([
        bar.bar.id,
        bar.back.textContent,
        bar.refresh.textContent,
        bar.types.checked,
        bar.tests.checked,
        bar.lazies.checked
      ]).toStrictEqual(['graph-modules-bar', 'Back', 'Refresh', true, true, true]);
    });

    it('WHEN the banner, Retry and slow notice are read THEN all three start hidden', () => {
      const bar = buildModulesBar();

      expect([bar.banner.hidden, bar.retry.hidden, bar.slow.hidden]).toStrictEqual([true, true, true]);
    });
  });
});
