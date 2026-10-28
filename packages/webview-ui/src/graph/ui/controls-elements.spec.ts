import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildControls } from './controls-elements.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { graphIconConstMock } from '../test/mocks/graph-icon-const.mock.ts';
import { SWAPPED_ACTION_ICONS_STUB as SWAPPED } from '../test/stubs/action-icons.stub.ts';
import { BOARDS_GROUPS_STUB } from '../test/stubs/folder-boards.stub.ts';
import { groupOf, iconClassOf, rowOf } from '../test/utils/controls-elements.spec.util.ts';

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

  describe('GIVEN the web row', () => {
    it('WHEN built THEN its Focus is an unpressed target icon button named Focus web, titled for focusing, out of the Tab order', () => {
      const elements = buildControls(BOARDS_GROUPS_STUB, ['app']);
      const { focus } = rowOf(elements, 'web');

      expect(focus.className).toBe('icon-button controls-focus');
      expect(iconClassOf(focus)).toBe('codicon codicon-target');
      expect(focus.getAttribute('aria-label')).toBe('Focus web');
      expect(focus.getAttribute('aria-pressed')).toBe('false');
      expect(focus).toMatchObject({ title: FOCUS_PACKAGE_TITLE, tabIndex: -1, textContent: '' });
    });
  });

  describe('GIVEN the apps folder header Focus', () => {
    it('WHEN built THEN it is a hidden, unpressed target icon button named Focus folder apps, out of the Tab order', () => {
      const elements = buildControls(BOARDS_GROUPS_STUB, ['app']);
      const { focus } = groupOf(elements, 'apps');

      expect(focus.className).toBe('icon-button controls-focus');
      expect(iconClassOf(focus)).toBe('codicon codicon-target');
      expect(focus.getAttribute('aria-label')).toBe('Focus folder apps');
      expect(focus.getAttribute('aria-pressed')).toBe('false');
      expect(focus).toMatchObject({ hidden: true, tabIndex: -1, textContent: '' });
    });
  });

  describe('GIVEN nothing filtered yet', () => {
    it('WHEN built THEN Show all reads Show all and starts hidden, never aria-disabled', () => {
      const { showAll } = buildControls(BOARDS_GROUPS_STUB, ['app']);

      expect(showAll).toMatchObject({ textContent: 'Show all', title: 'Show all', hidden: true });
      expect(showAll.getAttribute('aria-disabled')).toBeNull();
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

describe('FEATURE: buildControls icons from the action icon table', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    vi.resetModules();
    vi.doMock('../common/graph-icon.const.ts', (): object => graphIconConstMock(SWAPPED));
  });

  afterEach((): void => {
    vi.doUnmock('../common/graph-icon.const.ts');
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  describe('GIVEN a table where every action draws another icon', () => {
    it('WHEN built THEN the row and header Focus buttons draw the table focus icon', async () => {
      const swapped = await import('./controls-elements.ts');
      const elements = swapped.buildControls(BOARDS_GROUPS_STUB, []);
      const icons = [iconClassOf(rowOf(elements, 'web').focus), iconClassOf(groupOf(elements, 'apps').focus)];

      expect(icons).toStrictEqual([`codicon codicon-${SWAPPED.focus}`, `codicon codicon-${SWAPPED.focus}`]);
    });
  });
});
