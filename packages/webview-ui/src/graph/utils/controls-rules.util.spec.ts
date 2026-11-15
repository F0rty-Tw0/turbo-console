import { describe, expect, it } from 'vitest';

import {
  depthOf,
  focusClearedOf,
  focusFolderOn,
  focusNameOf,
  focusOn,
  groupStateOf,
  isFiltered,
  isGroupLocked,
  rowViewOf,
  sameMembers,
  showAllOf,
  toggleGroup,
  toggleRow,
  withDepth
} from './controls-rules.util.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';

const NONE: GraphFilters = { hidden: new Set(), focus: null, depth: 2, tags: new Set() };

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

const FOCUSED: GraphFilters = { ...NONE, focus: WEB_FOCUS };

const B_FOCUS: GraphFocus = { kind: 'package', name: 'b' };

const BUSY: GraphFilters = { hidden: new Set(['a']), focus: B_FOCUS, depth: 3, tags: new Set(['ui']) };

const APPS_FOCUS: GraphFocus = { kind: 'folder', folder: 'apps' };

const FOLDER_FOCUSED: GraphFilters = { ...NONE, focus: APPS_FOCUS };

describe('FEATURE: toggleGroup', () => {
  describe('GIVEN a focused web and a group of web and docs', () => {
    it('WHEN the group is unchecked THEN only docs is hidden', () => {
      const filters = toggleGroup(FOCUSED, ['web', 'docs'], false);

      expect(filters.hidden).toStrictEqual(new Set(['docs']));
    });
  });

  describe('GIVEN a group of only the focused web', () => {
    it('WHEN the group is unchecked THEN the filters are unchanged', () => {
      const filters = toggleGroup(FOCUSED, ['web'], false);

      expect(filters).toBe(FOCUSED);
    });
  });

  describe('GIVEN a half-hidden group', () => {
    it('WHEN the group is checked THEN nothing stays hidden', () => {
      const filters = toggleGroup({ ...NONE, hidden: new Set(['a']) }, ['a', 'b'], true);

      expect(filters.hidden).toStrictEqual(new Set());
    });
  });
});

describe('FEATURE: toggleGroup under a folder focus', () => {
  describe('GIVEN a folder focus', () => {
    it('WHEN the group web and admin is unchecked THEN both are hidden', () => {
      const filters = toggleGroup(FOLDER_FOCUSED, ['web', 'admin'], false);

      expect(filters.hidden).toStrictEqual(new Set(['web', 'admin']));
    });
  });
});

describe('FEATURE: toggleRow', () => {
  describe('GIVEN the focused name', () => {
    it('WHEN it is unchecked THEN the filters are unchanged', () => {
      const filters = toggleRow(FOCUSED, 'web', false);

      expect(filters).toStrictEqual(FOCUSED);
    });
  });

  describe('GIVEN a hidden name', () => {
    it('WHEN it is checked THEN it is shown again and the input is not changed', () => {
      const hiddenA: GraphFilters = { ...NONE, hidden: new Set(['a']) };

      const filters = toggleRow(hiddenA, 'a', true);

      expect(filters.hidden).toStrictEqual(new Set());
      expect(hiddenA.hidden).toStrictEqual(new Set(['a']));
    });
  });

  describe('GIVEN the name __proto__', () => {
    it('WHEN it is unchecked THEN it is hidden as a set member', () => {
      const filters = toggleRow(NONE, '__proto__', false);

      expect(filters.hidden.has('__proto__')).toBe(true);
    });
  });
});

describe('FEATURE: groupStateOf', () => {
  describe.each([
    ['nothing hidden', FOCUSED, ['web', 'docs'], 'checked'],
    ['every name but the focus hidden', { ...FOCUSED, hidden: new Set(['docs']) }, ['web', 'docs'], 'unchecked'],
    ['only the focused name', FOCUSED, ['web'], 'checked'],
    ['one of two hidden', { ...NONE, hidden: new Set(['a']) }, ['a', 'b'], 'mixed'],
    ['a hidden web under a folder focus', { ...FOLDER_FOCUSED, hidden: new Set(['web']) }, ['web'], 'unchecked']
  ])('GIVEN %s', (_label, filters, names, expected) => {
    it(`WHEN the state is read THEN it is ${expected}`, () => {
      const state = groupStateOf(filters, names);

      expect(state).toBe(expected);
    });
  });
});

describe('FEATURE: isGroupLocked', () => {
  describe.each([
    [FOCUSED, ['web'], true],
    [FOCUSED, ['web', 'docs'], false],
    [NONE, ['web'], false],
    [FOLDER_FOCUSED, ['web'], false],
    [FOLDER_FOCUSED, [], false]
  ])('GIVEN the filters %j and the names %j', (filters, names, expected) => {
    it(`WHEN read THEN it is ${expected}`, () => {
      const isLocked = isGroupLocked(filters, names);

      expect(isLocked).toBe(expected);
    });
  });
});

describe('FEATURE: focusOn', () => {
  describe('GIVEN a hidden web', () => {
    const hiddenWeb: GraphFilters = { ...NONE, hidden: new Set(['web']) };

    it('WHEN web is focused THEN the focus is web at depth 2 and web is no longer hidden', () => {
      const filters = focusOn(hiddenWeb, 'web');

      expect(filters.focus).toStrictEqual({ kind: 'package', name: 'web' });
      expect(filters.depth).toBe(2);
      expect(filters.hidden.has('web')).toBe(false);
    });

    it('WHEN web is focused twice THEN the focus is cleared', () => {
      const focused = focusOn(hiddenWeb, 'web');

      const filters = focusOn(focused, 'web');

      expect(filters.focus).toBeNull();
    });
  });

  describe('GIVEN a folder focus', () => {
    it('WHEN web is focused THEN the package focus replaces it', () => {
      const filters = focusOn(FOLDER_FOCUSED, 'web');

      expect(filters.focus).toStrictEqual({ kind: 'package', name: 'web' });
    });
  });
});

describe('FEATURE: focusFolderOn', () => {
  describe('GIVEN no focus', () => {
    it('WHEN apps is focused THEN the folder focus is apps and hidden and depth are kept', () => {
      const hiddenA: GraphFilters = { ...NONE, hidden: new Set(['a']) };

      const filters = focusFolderOn(hiddenA, 'apps');

      expect(filters.focus).toStrictEqual({ kind: 'folder', folder: 'apps' });
      expect(filters.hidden).toStrictEqual(new Set(['a']));
      expect(filters.depth).toBe(2);
    });
  });

  describe('GIVEN a package focus', () => {
    it('WHEN apps is focused THEN the folder replaces it and the old package is not hidden', () => {
      const filters = focusFolderOn(FOCUSED, 'apps');

      expect(filters.focus).toStrictEqual({ kind: 'folder', folder: 'apps' });
      expect(filters.hidden.has('web')).toBe(false);
    });
  });

  describe('GIVEN apps is the focus', () => {
    it('WHEN apps is focused again THEN the filters are the same object', () => {
      const filters = focusFolderOn(FOLDER_FOCUSED, 'apps');

      expect(filters).toBe(FOLDER_FOCUSED);
    });
  });
});

describe('FEATURE: focusClearedOf', () => {
  describe('GIVEN a folder focus', () => {
    it('WHEN cleared THEN the focus is null', () => {
      const filters = focusClearedOf(FOLDER_FOCUSED);

      expect(filters.focus).toBeNull();
    });
  });

  describe('GIVEN no focus', () => {
    it('WHEN cleared THEN the filters are the same object', () => {
      const filters = focusClearedOf(NONE);

      expect(filters).toBe(NONE);
    });
  });
});

describe('FEATURE: focusNameOf', () => {
  it.each([
    ['a package focus', FOCUSED, 'web'],
    ['a folder focus', FOLDER_FOCUSED, null],
    ['no focus', NONE, null]
  ])('GIVEN %s WHEN read THEN the package name is %j', (_label, filters, expected) => {
    const name = focusNameOf(filters);

    expect(name).toBe(expected);
  });
});

describe('FEATURE: showAllOf', () => {
  describe('GIVEN a folder focus', () => {
    it('WHEN Show all runs THEN the focus is cleared and the depth is kept', () => {
      const filters = showAllOf(FOLDER_FOCUSED);

      expect(filters.focus).toBeNull();
      expect(filters.depth).toBe(2);
    });
  });
});

describe('FEATURE: isFiltered', () => {
  describe('GIVEN hidden names, a focus and a tag', () => {
    it('WHEN read THEN it is true, and false once Show all ran', () => {
      const before = isFiltered(BUSY);
      const after = isFiltered(showAllOf(BUSY));

      expect(before).toBe(true);
      expect(after).toBe(false);
    });
  });

  describe('GIVEN only a folder focus', () => {
    it('WHEN read THEN it is true', () => {
      const isOn = isFiltered(FOLDER_FOCUSED);

      expect(isOn).toBe(true);
    });
  });
});

describe('FEATURE: withDepth', () => {
  describe('GIVEN no focus', () => {
    it('WHEN the depth changes THEN the depth is the new one', () => {
      const filters = withDepth(NONE, 3);

      expect(filters.depth).toBe(3);
    });
  });

  describe('GIVEN a focus', () => {
    it('WHEN the depth changes THEN the focus is kept at the new depth', () => {
      const filters = withDepth(FOCUSED, 3);

      expect(filters.focus).toStrictEqual({ kind: 'package', name: 'web' });
      expect(filters.depth).toBe(3);
    });
  });
});

describe('FEATURE: rowViewOf', () => {
  describe('GIVEN a hidden __proto__ and visible constructor', () => {
    it('WHEN read THEN the row is unchecked and not dimmed', () => {
      const hiddenProto = toggleRow(NONE, '__proto__', false);

      const view = rowViewOf(hiddenProto, new Set(['constructor']), '__proto__');

      expect(view).toStrictEqual({ isChecked: false, isDimmed: false, isLocked: false });
    });
  });

  describe('GIVEN a focused web', () => {
    it('WHEN docs is outside the focus THEN it is checked and dimmed', () => {
      const view = rowViewOf(FOCUSED, new Set(['web']), 'docs');

      expect(view).toStrictEqual({ isChecked: true, isDimmed: true, isLocked: false });
    });

    it('WHEN web itself is read THEN it is checked and locked', () => {
      const view = rowViewOf(FOCUSED, new Set(['web']), 'web');

      expect(view).toStrictEqual({ isChecked: true, isDimmed: false, isLocked: true });
    });
  });

  describe('GIVEN a folder focus', () => {
    it('WHEN web is read THEN it is not locked', () => {
      const view = rowViewOf(FOLDER_FOCUSED, new Set(['web']), 'web');

      expect(view.isLocked).toBe(false);
    });
  });
});

describe('FEATURE: sameMembers', () => {
  describe.each([
    [new Set(['a', 'b']), new Set(['b', 'a']), true],
    [new Set(['a']), new Set(['a', 'b']), false],
    [new Set(['a', 'b']), new Set(['a', 'c']), false]
  ])('GIVEN %j and %j', (left, right, expected) => {
    it(`WHEN compared THEN it is ${expected}`, () => {
      const isSame = sameMembers(left, right);

      expect(isSame).toBe(expected);
    });
  });
});

describe('FEATURE: depthOf', () => {
  it.each([
    ['1', 1],
    ['5', 5],
    ['3', 3],
    ['', null],
    ['0', null],
    ['6', null],
    ['2.5', null],
    ['1e1', null],
    [' 2', null]
  ])('GIVEN the text %j WHEN parsed THEN it is %j', (text, expected) => {
    const depth = depthOf(text);

    expect(depth).toBe(expected);
  });
});
