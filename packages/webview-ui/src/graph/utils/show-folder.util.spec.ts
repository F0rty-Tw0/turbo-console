import { describe, expect, it } from 'vitest';

import { groupStateOf, isGroupLocked } from './controls-rules.util.ts';
import { showFolderChecksOf, showFolderOf } from './show-folder.util.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import type { GroupState } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { ShowFolderState } from '../common/widget.type.ts';

const focusOf = (name: string | null): GraphFocus | null => {
  if (name === null) return null;

  const focus: GraphFocus = { kind: 'package', name };

  return focus;
};

const filtersOf = (hidden: string[], focusName: string | null): GraphFilters => {
  const focus = focusOf(focusName);
  const filters: GraphFilters = { hidden: new Set(hidden), focus, tags: new Set(), depth: 2 };

  return filters;
};

const CHECKED_OF: Record<GroupState, ShowFolderState['checked']> = {
  checked: 'true',
  unchecked: 'false',
  mixed: 'mixed'
};

const stateOf = (checked: ShowFolderState['checked'], isDisabled: boolean): ShowFolderState => {
  const state: ShowFolderState = { checked, isDisabled };

  return state;
};

describe('FEATURE: showFolderOf', () => {
  describe('GIVEN a folder of packages a and b', () => {
    it.each([
      { title: 'none hidden', hidden: [], focus: null, names: ['a', 'b'], expected: stateOf('true', false) },
      { title: 'both hidden', hidden: ['a', 'b'], focus: null, names: ['a', 'b'], expected: stateOf('false', false) },
      { title: 'b hidden', hidden: ['b'], focus: null, names: ['a', 'b'], expected: stateOf('mixed', false) },
      { title: 'a focused and b hidden', hidden: ['b'], focus: 'a', names: ['a', 'b'], expected: stateOf('false', false) },
      { title: 'a focused and the folder only a', hidden: [], focus: 'a', names: ['a'], expected: stateOf('true', true) }
    ])('WHEN $title THEN the state is $expected', ({ hidden, focus, names, expected }) => {
      const filters = filtersOf(hidden, focus);

      const state = showFolderOf(filters, names);

      expect(state).toStrictEqual(expected);
    });
  });

  describe('GIVEN any filters', () => {
    it.each([
      { hidden: [], focus: null },
      { hidden: ['a'], focus: null },
      { hidden: ['a', 'b'], focus: 'b' },
      { hidden: [], focus: 'a' }
    ])('WHEN hidden is $hidden and focus $focus THEN it equals the group checkbox twin', ({ hidden, focus }) => {
      const filters = filtersOf(hidden, focus);
      const names = ['a', 'b'];
      const twin = groupStateOf(filters, names);
      const twinLocked = isGroupLocked(filters, names);

      const state = showFolderOf(filters, names);

      expect(state).toStrictEqual(stateOf(CHECKED_OF[twin], twinLocked));
    });
  });
});

describe('FEATURE: showFolderChecksOf', () => {
  describe('GIVEN a folder group checkbox state', () => {
    it.each([
      { checked: 'mixed' as const, expected: true },
      { checked: 'false' as const, expected: true },
      { checked: 'true' as const, expected: false }
    ])('WHEN it is $checked THEN activating checks is $expected', ({ checked, expected }) => {
      const state = stateOf(checked, false);

      const isChecking = showFolderChecksOf(state);

      expect(isChecking).toBe(expected);
    });
  });
});
