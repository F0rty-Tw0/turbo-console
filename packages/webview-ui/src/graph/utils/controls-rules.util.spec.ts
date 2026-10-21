import { describe, expect, it } from 'vitest';

import {
  depthOf,
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
import type { GraphFilters, GraphFocus } from '../common/graph-filters.type.ts';

const NONE: GraphFilters = { hidden: new Set(), focus: null, tags: new Set() };

const WEB_FOCUS: GraphFocus = { name: 'web', depth: 1 };

const FOCUSED: GraphFilters = { ...NONE, focus: WEB_FOCUS };

const B_FOCUS: GraphFocus = { name: 'b', depth: 3 };

const BUSY: GraphFilters = { hidden: new Set(['a']), focus: B_FOCUS, tags: new Set(['ui']) };

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

describe('FEATURE: toggleRow', () => {
  it('GIVEN the focused name WHEN it is unchecked THEN the filters are unchanged', () => {
    const filters = toggleRow(FOCUSED, 'web', false);

    expect(filters).toStrictEqual(FOCUSED);
  });

  it('GIVEN a hidden name WHEN it is checked THEN it is shown again and the input is not changed', () => {
    const hiddenA: GraphFilters = { ...NONE, hidden: new Set(['a']) };

    const filters = toggleRow(hiddenA, 'a', true);

    expect(filters.hidden).toStrictEqual(new Set());
    expect(hiddenA.hidden).toStrictEqual(new Set(['a']));
  });

  it('GIVEN the name __proto__ WHEN it is unchecked THEN it is hidden as a set member', () => {
    const filters = toggleRow(NONE, '__proto__', false);

    expect(filters.hidden.has('__proto__')).toBe(true);
  });
});

describe('FEATURE: groupStateOf', () => {
  it.each([
    ['nothing hidden', FOCUSED, ['web', 'docs'], 'checked'],
    ['every name but the focus hidden', { ...FOCUSED, hidden: new Set(['docs']) }, ['web', 'docs'], 'unchecked'],
    ['only the focused name', FOCUSED, ['web'], 'checked'],
    ['one of two hidden', { ...NONE, hidden: new Set(['a']) }, ['a', 'b'], 'mixed']
  ])('GIVEN %s WHEN the state is read THEN it is %s', (_label, filters, names, expected) => {
    const state = groupStateOf(filters, names);

    expect(state).toBe(expected);
  });
});

describe('FEATURE: isGroupLocked', () => {
  it.each([
    [FOCUSED, ['web'], true],
    [FOCUSED, ['web', 'docs'], false],
    [NONE, ['web'], false]
  ])('GIVEN a focus and the names %j WHEN read THEN it is %s', (filters, names, expected) => {
    const isLocked = isGroupLocked(filters, names);

    expect(isLocked).toBe(expected);
  });
});

describe('FEATURE: focusOn', () => {
  describe('GIVEN a hidden web', () => {
    const hiddenWeb: GraphFilters = { ...NONE, hidden: new Set(['web']) };

    it('WHEN web is focused THEN the focus is web at depth 2 and web is no longer hidden', () => {
      const filters = focusOn(hiddenWeb, 'web', 2);

      expect(filters.focus).toStrictEqual({ name: 'web', depth: 2 });
      expect(filters.hidden.has('web')).toBe(false);
    });

    it('WHEN web is focused twice THEN the focus is cleared', () => {
      const focused = focusOn(hiddenWeb, 'web', 2);

      const filters = focusOn(focused, 'web', 2);

      expect(filters.focus).toBeNull();
    });
  });
});

describe('FEATURE: isFiltered', () => {
  it('GIVEN hidden names, a focus and a tag WHEN read THEN it is true, and false once Show all ran', () => {
    const before = isFiltered(BUSY);
    const after = isFiltered(showAllOf(BUSY));

    expect(before).toBe(true);
    expect(after).toBe(false);
  });
});

describe('FEATURE: withDepth', () => {
  it('GIVEN no focus WHEN the depth changes THEN the filters are unchanged', () => {
    const filters = withDepth(NONE, 3);

    expect(filters).toStrictEqual(NONE);
  });

  it('GIVEN a focus WHEN the depth changes THEN the focus keeps its name at the new depth', () => {
    const filters = withDepth(FOCUSED, 3);

    expect(filters.focus).toStrictEqual({ name: 'web', depth: 3 });
  });
});

describe('FEATURE: rowViewOf', () => {
  it('GIVEN a hidden __proto__ and visible constructor WHEN read THEN the row is unchecked and not dimmed', () => {
    const hiddenProto = toggleRow(NONE, '__proto__', false);

    const view = rowViewOf(hiddenProto, new Set(['constructor']), '__proto__');

    expect(view).toStrictEqual({ isChecked: false, isDimmed: false, isLocked: false });
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
});

describe('FEATURE: sameMembers', () => {
  it.each([
    [new Set(['a', 'b']), new Set(['b', 'a']), true],
    [new Set(['a']), new Set(['a', 'b']), false],
    [new Set(['a', 'b']), new Set(['a', 'c']), false]
  ])('GIVEN %j and %j WHEN compared THEN it is %s', (left, right, expected) => {
    const isSame = sameMembers(left, right);

    expect(isSame).toBe(expected);
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
