import { describe, expect, it } from 'vitest';

import { revealFiltersOf } from './reveal-filters.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';

const INFOS: GraphPackage[] = [
  { name: 'a', path: 'libs/a', tags: [], taskCount: 0 },
  { name: 'b', path: 'libs/b', tags: [], taskCount: 0 },
  { name: 'c', path: 'libs/c', tags: [], taskCount: 0 },
  { name: 'd', path: 'apps/d', tags: ['ui'], taskCount: 0 }
];

const EDGES: GraphEdge[] = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' }
];

/** `a` needs `b`, `b` needs `c`; `d`, alone in `apps`, is the only package tagged `ui`. */
const GRAPH: DrawnGraph = { hash: 'h', packages: ['a', 'b', 'c', 'd'], infos: INFOS, edges: EDGES };

const NONE: GraphFilters = { hidden: new Set(), focus: null, depth: 2, tags: new Set() };

const A_FOCUS: GraphFocus = { kind: 'package', name: 'a' };

const APPS_FOCUS: GraphFocus = { kind: 'folder', folder: 'apps' };

/** `a` focused at depth 1: `a` and `b` show. */
const A_FOCUSED: GraphFilters = { ...NONE, focus: A_FOCUS, depth: 1 };

const NONE_AT_DEPTH_1: GraphFilters = { ...NONE, depth: 1 };

const UI_TAGGED: GraphFilters = { ...NONE, tags: new Set(['ui']) };

describe('FEATURE: revealFiltersOf', () => {
  describe('GIVEN a filter that hides the package', () => {
    it.each([
      ['excluded only', { ...NONE, hidden: new Set(['b', 'c']) }, 'b', { ...NONE, hidden: new Set(['c']) }],
      ['outside the package focus', A_FOCUSED, 'c', NONE_AT_DEPTH_1],
      ['outside the folder focus', { ...NONE, focus: APPS_FOCUS }, 'a', NONE],
      ['outside the tag filter', UI_TAGGED, 'a', NONE],
      ['excluded and outside the focus', { ...A_FOCUSED, hidden: new Set(['c']) }, 'c', NONE_AT_DEPTH_1],
      ['excluded and outside the tag filter', { ...UI_TAGGED, hidden: new Set(['a']) }, 'a', NONE],
      ['inside the focus and outside the tag filter', { ...A_FOCUSED, tags: new Set(['ui']) }, 'b', A_FOCUSED]
    ])('WHEN revealing a package %s THEN only what hides it is cleared', (_name, filters, name, expected) => {
      const revealed = revealFiltersOf(filters, GRAPH, name);

      expect(revealed).toStrictEqual(expected);
    });
  });

  describe('GIVEN no filter hides the package', () => {
    it.each([
      ['no filters', NONE, 'a'],
      ['inside the focus', A_FOCUSED, 'b'],
      ['the focused package', A_FOCUSED, 'a'],
      ['a tagged package under the tag filter', UI_TAGGED, 'd'],
      ['another package excluded', { ...NONE, hidden: new Set(['c']) }, 'a']
    ])('WHEN revealing a package with %s THEN the filters themselves come back', (_name, filters, name) => {
      const revealed = revealFiltersOf(filters, GRAPH, name);

      expect(revealed).toBe(filters);
    });
  });
});
