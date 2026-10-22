import { describe, expect, it } from 'vitest';

import { freshViewStateOf } from './fresh-view-state.util.ts';
import { openingStateOf } from './grouping-open.util.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

type OpenCase = {
  readonly title: string;
  readonly saved: GraphViewState | null;
  readonly count: number;
  readonly hasShown: boolean;
  readonly expected: GraphViewState | null;
};

const FOLDERS = ['', '(root)', '__proto__', 'apps'];

const FRESH = freshViewStateOf('h');

const SAVED_FLAT: GraphViewState = { ...FRESH, grouped: false, zoom: 2 };

const GROUPED_OPEN: GraphViewState = { ...FRESH, grouped: true, collapsed: FOLDERS };

const CASES: OpenCase[] = [
  { title: '301 packages, nothing saved, no graph shown yet', saved: null, count: 301, hasShown: false, expected: GROUPED_OPEN },
  { title: '300 packages, nothing saved, no graph shown yet', saved: null, count: 300, hasShown: false, expected: null },
  { title: '301 packages, nothing saved, a graph shown already', saved: null, count: 301, hasShown: true, expected: null },
  {
    title: '301 packages, a flat saved state, no graph shown yet',
    saved: SAVED_FLAT,
    count: 301,
    hasShown: false,
    expected: SAVED_FLAT
  }
];

describe('FEATURE: openingStateOf', () => {
  describe('GIVEN the folders of a graph', () => {
    it.each(CASES)('WHEN it has $title THEN the opening state is as expected', ({ saved, count, hasShown, expected }) => {
      const state = openingStateOf(saved, 'h', FOLDERS, count, hasShown);

      expect(state).toStrictEqual(expected);
    });

    it('WHEN a flat saved state opens a graph of 301 packages THEN it is the same object', () => {
      const state = openingStateOf(SAVED_FLAT, 'h', FOLDERS, 301, false);

      expect(state).toBe(SAVED_FLAT);
    });

    it('WHEN nothing is saved THEN every other field equals a fresh state of the hash', () => {
      const fresh = freshViewStateOf('other');

      const state = openingStateOf(null, 'other', FOLDERS, 301, false);

      expect(state).toStrictEqual({ ...fresh, grouped: true, collapsed: FOLDERS });
    });
  });
});
