import { describe, expect, it } from 'vitest';

import { clearFolderFocusOf, excludeFolderOf, focusFolderOf, showFolderOf } from './folder-rules.util.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import { BOARDS_INFOS } from '../test/utils/folder-boards.spec.util.ts';

const NONE: GraphFilters = { hidden: new Set(), focus: null, depth: 2, tags: new Set() };

const APPS_FOCUS: GraphFocus = { kind: 'folder', folder: 'apps' };

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

const FOLDER_FOCUSED: GraphFilters = { ...NONE, focus: APPS_FOCUS };

const WEB_FOCUSED: GraphFilters = { ...NONE, focus: WEB_FOCUS };

const APPS_HIDDEN: GraphFilters = { ...NONE, hidden: new Set(['docs', 'web']) };

const DOCS_HIDDEN: GraphFilters = { ...NONE, hidden: new Set(['docs']) };

describe('FEATURE: focusFolderOf', () => {
  it.each([
    ['a folder focus', FOLDER_FOCUSED, 'apps'],
    ['a package focus', WEB_FOCUSED, null],
    ['no focus', NONE, null]
  ])('GIVEN %s WHEN the focused folder is read THEN it is %j', (_name, filters, expected) => {
    const folder = focusFolderOf(filters);

    expect(folder).toBe(expected);
  });
});

describe('FEATURE: clearFolderFocusOf', () => {
  describe('GIVEN a folder focus', () => {
    it('WHEN it is cleared THEN the focus is null and the rest is kept', () => {
      const filters = clearFolderFocusOf({ ...FOLDER_FOCUSED, hidden: new Set(['docs']) });

      expect(filters).toStrictEqual({ ...DOCS_HIDDEN });
    });
  });

  describe('GIVEN a package focus', () => {
    it('WHEN it is cleared THEN the filters are returned as they were', () => {
      const filters = clearFolderFocusOf(WEB_FOCUSED);

      expect(filters).toBe(WEB_FOCUSED);
    });
  });

  describe('GIVEN no focus', () => {
    it('WHEN it is cleared THEN the filters are returned as they were', () => {
      const filters = clearFolderFocusOf(NONE);

      expect(filters).toBe(NONE);
    });
  });
});

describe('FEATURE: excludeFolderOf', () => {
  describe('GIVEN the boards with nothing hidden', () => {
    it('WHEN apps is excluded THEN docs and web are hidden', () => {
      const filters = excludeFolderOf(NONE, BOARDS_INFOS, 'apps');

      expect(filters.hidden).toStrictEqual(new Set(['docs', 'web']));
    });

    it('WHEN a folder without packages is excluded THEN the filters are returned as they were', () => {
      const filters = excludeFolderOf(NONE, BOARDS_INFOS, 'missing');

      expect(filters).toBe(NONE);
    });
  });

  describe('GIVEN web is the focused package', () => {
    it('WHEN apps is excluded THEN only docs is hidden and the focus stays', () => {
      const filters = excludeFolderOf(WEB_FOCUSED, BOARDS_INFOS, 'apps');

      expect(filters.hidden).toStrictEqual(new Set(['docs']));
      expect(filters.focus).toStrictEqual(WEB_FOCUS);
    });

    it('WHEN a folder holding only web is excluded THEN the filters are returned as they were', () => {
      const onlyWeb = BOARDS_INFOS.filter((pkg) => pkg.name === 'web');
      const filters = excludeFolderOf(WEB_FOCUSED, onlyWeb, 'apps');

      expect(filters).toBe(WEB_FOCUSED);
    });
  });
});

describe('FEATURE: showFolderOf', () => {
  describe('GIVEN every package of apps is shown', () => {
    it('WHEN the folder is toggled THEN docs and web are hidden', () => {
      const filters = showFolderOf(NONE, BOARDS_INFOS, 'apps');

      expect(filters.hidden).toStrictEqual(new Set(['docs', 'web']));
    });
  });

  describe('GIVEN every package of apps is hidden', () => {
    it('WHEN the folder is toggled THEN none is hidden', () => {
      const filters = showFolderOf(APPS_HIDDEN, BOARDS_INFOS, 'apps');

      expect(filters.hidden).toStrictEqual(new Set());
    });
  });

  describe('GIVEN only docs of apps is hidden', () => {
    it('WHEN the folder is toggled THEN docs is shown again', () => {
      const filters = showFolderOf(DOCS_HIDDEN, BOARDS_INFOS, 'apps');

      expect(filters.hidden).toStrictEqual(new Set());
    });
  });

  describe('GIVEN web is the focused package and docs is hidden', () => {
    it('WHEN apps is toggled THEN docs is shown again', () => {
      const filters = showFolderOf({ ...WEB_FOCUSED, hidden: new Set(['docs']) }, BOARDS_INFOS, 'apps');

      expect(filters.hidden).toStrictEqual(new Set());
    });
  });
});
