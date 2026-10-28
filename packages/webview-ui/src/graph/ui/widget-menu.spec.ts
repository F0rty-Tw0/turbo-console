import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMenu } from './widget-menu.ts';
import type { MenuItem } from '../common/widget-menu.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const run = (): void => undefined;

const FOCUS_ITEM: MenuItem = { kind: 'item', label: 'Focus', icon: 'target', isDisabled: false, run };

const PLAIN_ITEM: MenuItem = { ...FOCUS_ITEM, label: 'Plain', icon: null };

const TRACE_ITEM: MenuItem = { ...FOCUS_ITEM, label: 'Start trace', title: 'Pick the package to trace to' };

/** The one built item. */
const builtItemOf = (item: MenuItem): HTMLElement => {
  const [built] = buildMenu([item], 'Actions for web').items;

  if (built === undefined) throw new Error('widget-menu spec: no item built');

  return built;
};

/** The built item's first child, the icon column. */
const iconColumnOf = (item: MenuItem): Element => {
  const [column] = builtItemOf(item).children;

  if (column === undefined) throw new Error('widget-menu spec: no icon column built');

  return column;
};

describe('FEATURE: buildMenu', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an item with the focus icon', () => {
    it('WHEN built THEN its first child is the icon column', () => {
      const column = iconColumnOf(FOCUS_ITEM);

      expect(column.className).toBe('widget-menu-icon');
    });

    it('WHEN built THEN the icon column holds the focus Codicon', () => {
      const column = iconColumnOf(FOCUS_ITEM);
      const classes = Array.from(column.children, (icon): string => icon.className);

      expect(classes).toStrictEqual([expect.stringContaining('codicon-target')]);
    });

    it('WHEN built THEN it is a menuitem with no aria-checked', () => {
      const item = builtItemOf(FOCUS_ITEM);

      const roles = [item.getAttribute('role'), item.getAttribute('aria-checked')];

      expect(roles).toStrictEqual(['menuitem', null]);
    });
  });

  it('GIVEN an item with no icon WHEN built THEN its icon column is there and empty', () => {
    const column = iconColumnOf(PLAIN_ITEM);

    expect([column.className, column.children.length]).toStrictEqual(['widget-menu-icon', 0]);
  });

  describe('GIVEN an item with no title and an item with one', () => {
    it('WHEN built THEN each item title is its own title, else its label', () => {
      const { items } = buildMenu([FOCUS_ITEM, TRACE_ITEM], 'Actions for web');
      const titles = items.map((item): string => item.title);

      expect(titles).toStrictEqual(['Focus', 'Pick the package to trace to']);
    });
  });
});
