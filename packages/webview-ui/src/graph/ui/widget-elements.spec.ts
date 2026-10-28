import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildFolderRow } from './widget-elements.ts';
import type { FolderRowElements } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

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

    it('WHEN its children are read THEN they are the chevron, the folder glyph, the title, the count badge and the "…"', () => {
      const classes = classesOf(row.root);

      expect(classes).toStrictEqual([
        'widget-button',
        'codicon codicon-folder-opened widget-glyph',
        'widget-title',
        'widget-count',
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

    it('WHEN its children are read THEN they are the chevron, the folder glyph, the title, the count badge and the "…"', () => {
      const classes = classesOf(row.root);

      expect(classes).toStrictEqual([
        'widget-button',
        'codicon codicon-folder-opened widget-glyph',
        'widget-title',
        'widget-count',
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
