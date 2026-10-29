import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildFolderRow, buildPackageToolbar } from './widget-elements.ts';
import { START_TRACE_TITLE } from '../common/details.const.ts';
import { ACTION_ICONS } from '../common/graph-icon.const.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import type { FolderRowElements, PackageToolbarElements } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { toolbarButtonsOf } from '../test/utils/package-toolbar.spec.util.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';

const classesOf = (parent: Element): string[] => {
  return Array.from(parent.children, (child): string => {
    return child.className;
  });
};

const textsOf = (parent: Element): (string | null)[] => {
  return Array.from(parent.children, (child): string | null => {
    return child.textContent;
  });
};

const attributesOf = (parent: Element, name: string): (string | null)[] => {
  return Array.from(parent.children, (child): string | null => {
    return child.getAttribute(name);
  });
};

/** The count badge: the fourth child of a box row. */
const badgeOf = (row: FolderRowElements): Element => {
  const [, , , badge] = Array.from(row.root.children);

  if (badge === undefined) throw new Error('the row has no badge');

  return badge;
};

describe('FEATURE: buildFolderRow', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an expanded folder with 12 packages', () => {
    let row: FolderRowElements;

    beforeEach((): void => {
      row = buildFolderRow('box', 'apps', 12);
    });

    it('WHEN its children are read THEN they are the chevron, the folder glyph, the title, the count badge, Focus folder and the "…"', () => {
      const classes = classesOf(row.root);

      expect(classes).toStrictEqual([
        'widget-button',
        'codicon codicon-folder-opened widget-glyph',
        'widget-title',
        'widget-count',
        'widget-button',
        'widget-button'
      ]);
    });

    it('WHEN the title is read THEN it is the third child, a type=button button with the full title and no aria-label', () => {
      const [, , third] = Array.from(row.root.children);
      const shape = [
        row.title.tagName,
        row.title.type,
        row.title.className,
        row.title.textContent,
        row.title.getAttribute('title'),
        row.title.getAttribute('aria-label')
      ];

      expect(third).toBe(row.title);
      expect(shape).toStrictEqual(['BUTTON', 'button', 'widget-title', 'apps', 'apps', null]);
    });

    it('WHEN Focus folder is read THEN it is the fifth child, labelled Focus folder apps, unpressed, drawing the target icon', () => {
      const [, , , , fifth] = Array.from(row.root.children);
      const [icon] = Array.from(row.focus.children);
      const shape = [row.focus.getAttribute('aria-label'), row.focus.title, row.focus.getAttribute('aria-pressed'), icon?.className];

      expect(fifth).toBe(row.focus);
      expect(shape).toStrictEqual(['Focus folder apps', 'Focus folder', 'false', 'codicon codicon-target']);
    });

    it('WHEN the row is read THEN it is a toolbar named by the folder title', () => {
      const shape = [row.root.getAttribute('role'), row.root.getAttribute('aria-label')];

      expect(shape).toStrictEqual(['toolbar', 'apps']);
    });

    it("WHEN its buttons' tabIndex are read THEN only the chevron is a Tab stop", () => {
      const buttons = [row.chevron, row.title, row.focus, row.ellipsis];
      const tabIndexes = buttons.map((button): number => button.tabIndex);

      expect(tabIndexes).toStrictEqual([0, -1, -1, -1]);
    });

    it('WHEN the chevron is read THEN its aria-label is also its title', () => {
      expect(row.chevron.title).toBe('Collapse apps');
    });

    it('WHEN the glyph is read THEN screen readers skip it', () => {
      const hidden = attributesOf(row.root, 'aria-hidden');

      expect(hidden[1]).toBe('true');
    });

    it('WHEN the badge number is read THEN it shows 12', () => {
      const badge = badgeOf(row);

      const [numberText] = textsOf(badge);

      expect(numberText).toBe('12');
    });

    it('WHEN the badge number is read THEN screen readers skip it', () => {
      const badge = badgeOf(row);

      const [numberHidden] = attributesOf(badge, 'aria-hidden');

      expect(numberHidden).toBe('true');
    });

    it('WHEN the badge plural is read THEN it is visually hidden', () => {
      const badge = badgeOf(row);

      const [, pluralClass] = classesOf(badge);

      expect(pluralClass).toBe('visually-hidden');
    });

    it('WHEN the badge plural is read THEN it reads 12 packages', () => {
      const badge = badgeOf(row);

      const [, pluralText] = textsOf(badge);

      expect(pluralText).toBe('12 packages');
    });

    it('WHEN the badge title is read THEN it holds the plural for the tooltip', () => {
      const badge = badgeOf(row);

      const title = badge.getAttribute('title');

      expect(title).toBe('12 packages');
    });
  });

  describe('GIVEN an expanded folder with 1 package', () => {
    it('WHEN the badge is read THEN the number is 1 and the plural is singular', () => {
      const row = buildFolderRow('box', 'apps', 1);
      const badge = badgeOf(row);

      const texts = textsOf(badge);

      expect(texts).toStrictEqual(['1', '1 package']);
    });

    it('WHEN the badge is read THEN its tooltip is singular', () => {
      const row = buildFolderRow('box', 'apps', 1);
      const badge = badgeOf(row);

      const title = badge.getAttribute('title');

      expect(title).toBe('1 package');
    });
  });

  describe('GIVEN a collapsed folder with 12 packages', () => {
    let row: FolderRowElements;

    beforeEach((): void => {
      row = buildFolderRow('collapsed', 'apps', 12);
    });

    it('WHEN its children are read THEN they are the chevron, the folder glyph, the title, the count badge, Focus folder and the "…"', () => {
      const classes = classesOf(row.root);

      expect(classes).toStrictEqual([
        'widget-button',
        'codicon codicon-folder-opened widget-glyph',
        'widget-title',
        'widget-count',
        'widget-button',
        'widget-button'
      ]);
    });

    it('WHEN the title and badge are read THEN the title attribute keeps the whole name and the badge says "12 packages"', () => {
      const [, , titleAttribute] = attributesOf(row.root, 'title');
      const badgeTitle = badgeOf(row).getAttribute('title');

      expect(titleAttribute).toBe('apps');
      expect(badgeTitle).toBe('12 packages');
    });
  });
});

describe('FEATURE: buildPackageToolbar', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the package toolbar of web in the folder apps', () => {
    let toolbar: PackageToolbarElements;

    beforeEach((): void => {
      toolbar = buildPackageToolbar('web', 'apps');
    });

    it('WHEN the root is read THEN it is a hidden toolbar named Package web', () => {
      const { root } = toolbar;

      expect(root.className).toBe('widget-toolbar widget-toolbar-package');
      expect(root.getAttribute('role')).toBe('toolbar');
      expect(root.getAttribute('aria-label')).toBe('Package web');
      expect(root.hidden).toBe(true);
    });

    it('WHEN its children are read THEN they are Focus, Start trace, Show tasks, Collapse folder and the "…"', () => {
      const children = Array.from(toolbar.root.children);

      expect(children).toStrictEqual(toolbarButtonsOf(toolbar));
    });

    it('WHEN the buttons are read THEN each is named for its action', () => {
      const labels = attributesOf(toolbar.root, 'aria-label');

      expect(labels).toStrictEqual(['Focus web', 'Start trace', 'Show tasks', 'Collapse folder apps', 'Actions for web']);
    });

    it('WHEN the buttons are read THEN each hover title says what a press does', () => {
      const buttons = toolbarButtonsOf(toolbar);
      const titles = buttons.map((button): string | undefined => button?.title);

      expect(titles).toStrictEqual([FOCUS_PACKAGE_TITLE, START_TRACE_TITLE, 'Show tasks', 'Collapse folder apps', 'Actions for web']);
    });

    it('WHEN the icons are read THEN each button draws the icon of its action', () => {
      const icons = Array.from(toolbar.root.children, (button): string | undefined => button.children[0]?.className);

      expect(icons).toStrictEqual([
        `codicon codicon-${ACTION_ICONS.focus}`,
        `codicon codicon-${ACTION_ICONS.startTrace}`,
        `codicon codicon-${ACTION_ICONS.showTasks}`,
        `codicon codicon-${ACTION_ICONS.collapse}`,
        'codicon codicon-ellipsis'
      ]);
    });

    it('WHEN Focus is read THEN it is unpressed', () => {
      expect(toolbar.focus.getAttribute('aria-pressed')).toBe('false');
    });

    it('WHEN the "…" is read THEN it opens a menu', () => {
      expect(toolbar.ellipsis.getAttribute('aria-haspopup')).toBe('menu');
    });

    it('WHEN the tabIndex are read THEN only Focus is a Tab stop', () => {
      const buttons = toolbarButtonsOf(toolbar);
      const stops = buttons.map((button): number | undefined => button?.tabIndex);

      expect(stops).toStrictEqual([0, -1, -1, -1, -1]);
    });

    it('WHEN the root is read THEN it sets no tabindex', () => {
      expect(toolbar.root.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('GIVEN the package toolbar of web on a flat page', () => {
    let toolbar: PackageToolbarElements;

    beforeEach((): void => {
      toolbar = buildPackageToolbar('web', null);
    });

    it('WHEN its collapse button is read THEN there is none', () => {
      expect(toolbar.collapse).toBeNull();
    });

    it('WHEN its children are read THEN they are Focus, Start trace, Show tasks and the "…"', () => {
      const labels = attributesOf(toolbar.root, 'aria-label');

      expect(labels).toStrictEqual(['Focus web', 'Start trace', 'Show tasks', 'Actions for web']);
    });
  });

  describe('GIVEN the package toolbar of web in the root folder', () => {
    it('WHEN its collapse button is read THEN it is named for the (root) folder', () => {
      const toolbar = buildPackageToolbar('web', folderTitleOf(''));

      expect(toolbar.collapse?.getAttribute('aria-label')).toBe('Collapse folder (root)');
    });
  });
});
