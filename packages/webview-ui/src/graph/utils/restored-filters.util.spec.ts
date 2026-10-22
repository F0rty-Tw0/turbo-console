import { describe, expect, it } from 'vitest';

import { controlsFieldsOf, restoredFilters } from './restored-filters.util.ts';
import type { GraphPackage, Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestoredControls } from '../common/graph-controls.type.ts';
import type { GraphFilters, GraphFocus } from '../common/graph-filters.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';

const INFOS: GraphPackage[] = [
  { name: 'web', path: 'apps/web', tags: ['ui'], taskCount: 0 },
  { name: 'api', path: 'apps/api', tags: [], taskCount: 0 },
  { name: '__proto__', path: 'libs/proto', tags: [], taskCount: 0 },
  { name: 'constructor', path: 'libs/ctor', tags: [], taskCount: 0 }
];

const GRAPH: DrawnGraph = { hash: 'h', packages: ['web', 'api', '__proto__', 'constructor'], infos: INFOS, edges: [] };

const ORIGIN: Position = { x: 0, y: 0 };

const STATE: GraphViewState = {
  hash: 'h',
  zoom: 1,
  pan: ORIGIN,
  selected: null,
  controlsOpen: false,
  search: 'we',
  depth: 2,
  hidden: ['web', 'gone'],
  focus: 'web',
  tags: ['ui', 'old'],
  detailsOpen: true,
  link: null,
  trace: null,
  folder: null,
  grouped: false,
  collapsed: []
};

describe('FEATURE: restoredFilters', () => {
  describe('GIVEN a saved state naming packages and tags the graph no longer has', () => {
    it('WHEN restored THEN only the known entries stay and the focused name leaves hidden', () => {
      const focus: GraphFocus = { name: 'web', depth: 2 };
      const filters: GraphFilters = { hidden: new Set(), focus, tags: new Set(['ui']) };
      const expected: RestoredControls = { filters, search: 'we', depth: 2, isOpen: false, isGrouped: false };

      const restored = restoredFilters(STATE, GRAPH);

      expect(restored).toStrictEqual(expected);
    });
  });

  it('GIVEN a focus on an unknown package WHEN restored THEN there is no focus', () => {
    const restored = restoredFilters({ ...STATE, focus: 'ghost' }, GRAPH);

    expect(restored.filters.focus).toBeNull();
  });

  it('GIVEN names that are object keys WHEN restored THEN they are kept as set members', () => {
    const restored = restoredFilters({ ...STATE, hidden: ['__proto__'], focus: 'constructor' }, GRAPH);

    expect(restored.filters.hidden).toStrictEqual(new Set(['__proto__']));
    expect(restored.filters.focus).toStrictEqual({ name: 'constructor', depth: 2 });
  });
});

describe('FEATURE: restoredFilters grouping', () => {
  it.each([
    ['a grouped saved state', true],
    ['an ungrouped saved state', false]
  ])('GIVEN %s WHEN restored THEN isGrouped follows it', (_name, grouped) => {
    const restored = restoredFilters({ ...STATE, grouped }, GRAPH);

    expect(restored.isGrouped).toBe(grouped);
  });
});

describe('FEATURE: controlsFieldsOf', () => {
  it.each([
    ['grouped', true],
    ['ungrouped', false]
  ])('GIVEN a %s panel WHEN saved THEN grouped follows it', (_name, isGrouped) => {
    const filters: GraphFilters = { hidden: new Set(), focus: null, tags: new Set() };

    const fields = controlsFieldsOf(filters, '', 2, true, isGrouped);

    expect(fields.grouped).toBe(isGrouped);
  });

  it('GIVEN hidden names, a focus and tags WHEN saved THEN the fields list them and name the focus', () => {
    const focus: GraphFocus = { name: 'web', depth: 2 };
    const filters: GraphFilters = { hidden: new Set(['api']), focus, tags: new Set(['ui']) };

    const fields = controlsFieldsOf(filters, 'we', 2, false, false);

    expect(fields).toStrictEqual({
      controlsOpen: false,
      search: 'we',
      depth: 2,
      hidden: ['api'],
      focus: 'web',
      tags: ['ui'],
      grouped: false
    });
  });

  it('GIVEN no focus WHEN saved THEN the focus is null', () => {
    const filters: GraphFilters = { hidden: new Set(), focus: null, tags: new Set() };

    const fields = controlsFieldsOf(filters, '', 1, true, false);

    expect(fields.focus).toBeNull();
  });
});
