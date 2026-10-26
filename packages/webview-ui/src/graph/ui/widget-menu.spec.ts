import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMenu } from './widget-menu.ts';
import type { MenuItem } from '../common/widget-menu.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const run = (): void => undefined;

const FOCUS_ITEM: MenuItem = { kind: 'item', label: 'Focus', role: 'menuitem', checked: null, isDisabled: false, run };

const TRACE_ITEM: MenuItem = { ...FOCUS_ITEM, label: 'Start trace', title: 'Pick the package to trace to' };

describe('FEATURE: buildMenu', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an item with no title and an item with one', () => {
    it('WHEN built THEN each item title is its own title, else its label', () => {
      const { items } = buildMenu([FOCUS_ITEM, TRACE_ITEM], 'Actions for web');
      const titles = items.map((item): string => item.title);

      expect(titles).toStrictEqual(['Focus', 'Pick the package to trace to']);
    });
  });
});
