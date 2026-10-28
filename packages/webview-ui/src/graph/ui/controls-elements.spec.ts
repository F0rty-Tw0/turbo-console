import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildControls } from './controls-elements.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { BOARDS_GROUPS_STUB } from '../test/stubs/folder-boards.stub.ts';
import { groupOf, iconClassOf } from '../test/utils/controls-elements.spec.util.ts';

const sectionsOf = (panel: HTMLElement): Element[] => Array.from(panel.children);

const childrenOf = (element: Element | undefined): Element[] => Array.from(element?.children ?? []);

describe('FEATURE: buildControls', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN two folders and one tag', () => {
    it('WHEN built THEN the panel holds the Search, View and Packages sections, each headed by its title', () => {
      const { panel } = buildControls(BOARDS_GROUPS_STUB, ['app']);
      const sections = sectionsOf(panel);
      const shapes = sections.map((section): (string | null | undefined)[] => {
        const heading = section.children[0];

        return [section.tagName, section.className, heading?.tagName, heading?.textContent];
      });

      expect(shapes).toStrictEqual([
        ['SECTION', 'controls-section', 'H3', 'Search'],
        ['SECTION', 'controls-section', 'H3', 'View'],
        ['SECTION', 'controls-section', 'H3', 'Packages']
      ]);
    });

    it('WHEN built THEN View holds the Focus depth field, then Group by folder', () => {
      const { panel, depth, grouping } = buildControls(BOARDS_GROUPS_STUB, ['app']);
      const [, depthGroup, groupingLabel] = childrenOf(sectionsOf(panel)[1]);

      expect(depthGroup?.contains(depth)).toBe(true);
      expect(groupingLabel?.contains(grouping)).toBe(true);
    });

    it('WHEN built THEN Packages holds the tag fieldset, Show all, the count line and the grid, in that order', () => {
      const { panel, tags, showAll, count, list } = buildControls(BOARDS_GROUPS_STUB, ['app']);
      const [, fieldset, ...rest] = childrenOf(sectionsOf(panel)[2]);
      const tagBox = tags.get('app') ?? null;

      expect(fieldset?.contains(tagBox)).toBe(true);
      expect(rest).toStrictEqual([showAll, count, list]);
    });
  });

  describe('GIVEN the apps folder header', () => {
    it('WHEN built THEN its toggle is a hidden chevron-down icon button named and titled Collapse folder apps, out of the Tab order', () => {
      const elements = buildControls(BOARDS_GROUPS_STUB, ['app']);
      const { toggle } = groupOf(elements, 'apps');

      expect(toggle.className).toBe('icon-button controls-toggle');
      expect(iconClassOf(toggle)).toBe('codicon codicon-chevron-down');
      expect(toggle.getAttribute('aria-label')).toBe('Collapse folder apps');
      expect(toggle).toMatchObject({ title: 'Collapse folder apps', hidden: true, tabIndex: -1, textContent: '' });
    });
  });

  describe('GIVEN no tags', () => {
    it('WHEN built THEN Packages holds Show all, the count line and the grid after its heading', () => {
      const { panel, showAll, count, list } = buildControls(BOARDS_GROUPS_STUB, []);
      const [, ...rest] = childrenOf(sectionsOf(panel)[2]);

      expect(rest).toStrictEqual([showAll, count, list]);
    });
  });
});
