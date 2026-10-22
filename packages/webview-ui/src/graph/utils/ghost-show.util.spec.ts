import { describe, expect, it } from 'vitest';

import { isShowable } from './ghost-show.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFilters, GraphFocus } from '../common/graph-filters.type.ts';

type FilterSpec = {
  readonly hidden?: string[];
  readonly focus?: GraphFocus;
  readonly tags?: string[];
};

const pkgOf = (name: string, path: string, tags: string[]): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags, taskCount: 0 };

  return pkg;
};

const edgeOf = (source: string, target: string): GraphEdge => {
  const edge: GraphEdge = { source, target };

  return edge;
};

const filtersOf = (spec: FilterSpec): GraphFilters => {
  const hidden = new Set(spec.hidden);
  const focus = spec.focus ?? null;
  const tags = new Set(spec.tags);
  const filters: GraphFilters = { hidden, focus, tags };

  return filters;
};

const PACKAGES: GraphPackage[] = [
  pkgOf('web', 'apps/web', ['app']),
  pkgOf('ui', 'packages/ui', ['lib']),
  pkgOf('core', 'packages/core', ['lib']),
  pkgOf('docs', 'apps/docs', ['app']),
  pkgOf('__proto__', 'packages/proto', ['lib'])
];

const EDGES: GraphEdge[] = [edgeOf('web', 'ui'), edgeOf('ui', 'core')];

const AROUND_WEB: GraphFocus = { name: 'web', depth: 1 };

const NONE: FilterSpec = {};

const UI_UNCHECKED: FilterSpec = { hidden: ['ui'] };

const APP_TAG: FilterSpec = { tags: ['app'] };

const WEB_FOCUS: FilterSpec = { focus: AROUND_WEB };

const UI_UNCHECKED_IN_FOCUS: FilterSpec = { hidden: ['ui'], focus: AROUND_WEB };

const UI_UNCHECKED_APP_TAG: FilterSpec = { hidden: ['ui'], tags: ['app'] };

const GHOST_UNCHECKED: FilterSpec = { hidden: ['ghost'] };

const PROTO_UNCHECKED: FilterSpec = { hidden: ['__proto__'] };

describe('FEATURE: isShowable', () => {
  describe('GIVEN a package and the filters', () => {
    it.each([
      { title: 'already visible', spec: NONE, name: 'ui', expected: false },
      { title: 'unchecked', spec: UI_UNCHECKED, name: 'ui', expected: true },
      { title: 'hidden by the tag filter', spec: APP_TAG, name: 'ui', expected: false },
      { title: 'outside the focus', spec: WEB_FOCUS, name: 'core', expected: false },
      { title: 'unchecked and inside the focus', spec: UI_UNCHECKED_IN_FOCUS, name: 'ui', expected: true },
      { title: 'the focused package', spec: WEB_FOCUS, name: 'web', expected: false },
      { title: 'unchecked and tag-excluded', spec: UI_UNCHECKED_APP_TAG, name: 'ui', expected: false },
      { title: 'unknown name', spec: GHOST_UNCHECKED, name: 'ghost', expected: false },
      { title: '__proto__ unchecked', spec: PROTO_UNCHECKED, name: '__proto__', expected: true }
    ])('WHEN $title THEN it is $expected', ({ spec, name, expected }) => {
      const filters = filtersOf(spec);

      expect(isShowable(PACKAGES, EDGES, filters, name)).toBe(expected);
    });
  });
});
