import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildFolderRow } from './widget-elements.ts';
import type { FolderRowElements } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const classesOf = (parent: Element): string[] => Array.from(parent.children, (child) => child.className);

const textsOf = (parent: Element): (string | null)[] => Array.from(parent.children, (child) => child.textContent);

const attributesOf = (parent: Element, name: string): (string | null)[] =>
  Array.from(parent.children, (child) => child.getAttribute(name));

/** The count badge: the fourth child of a box row. */
const badgeOf = (row: FolderRowElements): Element => {
  const [, , , badge] = Array.from(row.root.children);

  if (badge === undefined) throw new Error('the row has no badge');

  return badge;
};

describe('FEATURE: buildFolderRow', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an expanded folder with 12 packages', () => {
    let row: FolderRowElements;

    beforeEach(() => {
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

    it('WHEN the glyph is read THEN screen readers skip it', () => {
      const hidden = attributesOf(row.root, 'aria-hidden');

      expect(hidden[1]).toBe('true');
    });

    it('WHEN the badge number is read THEN it shows 12 and screen readers skip it', () => {
      const badge = badgeOf(row);

      expect(textsOf(badge)[0]).toBe('12');
      expect(attributesOf(badge, 'aria-hidden')[0]).toBe('true');
    });

    it('WHEN the badge plural is read THEN it is visually hidden text reading 12 packages', () => {
      const badge = badgeOf(row);

      expect(classesOf(badge)[1]).toBe('visually-hidden');
      expect(textsOf(badge)[1]).toBe('12 packages');
    });

    it('WHEN the badge title is read THEN it holds the plural for the tooltip', () => {
      const badge = badgeOf(row);

      expect(badge.getAttribute('title')).toBe('12 packages');
    });
  });

  describe('GIVEN an expanded folder with 1 package', () => {
    it('WHEN the badge is read THEN the number is 1 and the plural and tooltip are singular', () => {
      const row = buildFolderRow('box', 'apps', 1);
      const badge = badgeOf(row);

      expect(textsOf(badge)).toStrictEqual(['1', '1 package']);
      expect(badge.getAttribute('title')).toBe('1 package');
    });
  });

  describe('GIVEN a collapsed folder', () => {
    it('WHEN its children are read THEN they are the chevron and the "…" only', () => {
      const row = buildFolderRow('collapsed', 'apps', 12);
      const classes = classesOf(row.root);

      expect(classes).toStrictEqual(['widget-button', 'widget-button']);
    });
  });
});
