import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMenu } from './widget-menu.ts';
import type { MenuItem } from '../common/widget-menu.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { firstItemOf, iconColumnOf } from '../test/utils/built-menu.spec.util.ts';

const run = (): void => undefined;

const MENU_LABEL = 'Actions for web';

const FOCUS_ITEM: MenuItem = { kind: 'item', label: 'Focus', icon: 'target', isDisabled: false, run };

const PLAIN_ITEM: MenuItem = { ...FOCUS_ITEM, label: 'Plain', icon: null };

const TRACE_ITEM: MenuItem = { ...FOCUS_ITEM, label: 'Start trace', title: 'Pick the package to trace to' };

describe('FEATURE: buildMenu', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an item with the focus icon', () => {
    it('WHEN built THEN its first child is the icon column', () => {
      const { items } = buildMenu([FOCUS_ITEM], MENU_LABEL);
      const column = iconColumnOf(items);

      expect(column.className).toBe('widget-menu-icon');
    });

    it('WHEN built THEN the icon column holds the focus Codicon', () => {
      const { items } = buildMenu([FOCUS_ITEM], MENU_LABEL);
      const column = iconColumnOf(items);
      const classes = Array.from(column.children, (icon): string => icon.className);

      expect(classes).toStrictEqual(['codicon codicon-target']);
    });

    it('WHEN built THEN it is a menuitem with no aria-checked', () => {
      const { items } = buildMenu([FOCUS_ITEM], MENU_LABEL);
      const item = firstItemOf(items);
      const roles = [item.getAttribute('role'), item.getAttribute('aria-checked')];

      expect(roles).toStrictEqual(['menuitem', null]);
    });
  });

  describe('GIVEN an item with no icon', () => {
    it('WHEN built THEN its icon column is there and empty', () => {
      const { items } = buildMenu([PLAIN_ITEM], MENU_LABEL);
      const column = iconColumnOf(items);

      expect([column.className, column.children.length]).toStrictEqual(['widget-menu-icon', 0]);
    });
  });

  describe('GIVEN an item with no title and an item with one', () => {
    it('WHEN built THEN each item title is its own title, else its label', () => {
      const { items } = buildMenu([FOCUS_ITEM, TRACE_ITEM], MENU_LABEL);
      const titles = items.map((item): string => item.title);

      expect(titles).toStrictEqual(['Focus', 'Pick the package to trace to']);
    });
  });
});
