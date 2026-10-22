import { describe, expect, it } from 'vitest';

import { readGraphViewState } from './graph-view-state.util.ts';
import { controlsFieldsOf, restoredFilters } from './restored-filters.util.ts';
import type { GraphPackage, Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphFocus, GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestoredControls } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';

const INFOS: GraphPackage[] = [
  { name: 'web', path: 'apps/web', tags: ['ui'], taskCount: 0 },
  { name: 'api', path: 'apps/api', tags: [], taskCount: 0 },
  { name: '__proto__', path: 'libs/proto', tags: [], taskCount: 0 },
  { name: 'constructor', path: 'libs/ctor', tags: [], taskCount: 0 }
];

const GRAPH: DrawnGraph = { hash: 'h', packages: ['web', 'api', '__proto__', 'constructor'], infos: INFOS, edges: [] };

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

const GHOST_FOCUS: GraphFocus = { kind: 'package', name: 'ghost' };

const APPS_FOCUS: GraphFocus = { kind: 'folder', folder: 'apps' };

const ZZZ_FOCUS: GraphFocus = { kind: 'folder', folder: 'zzz' };

const ROOT_FOCUS: GraphFocus = { kind: 'folder', folder: '' };

const PROTO_FOLDER_FOCUS: GraphFocus = { kind: 'folder', folder: '__proto__' };

const DOCS: GraphPackage = { name: 'docs', path: 'docs', tags: [], taskCount: 0 };

const ROOTED_INFOS: GraphPackage[] = [...INFOS, DOCS];

const ROOTED: DrawnGraph = { ...GRAPH, infos: ROOTED_INFOS };

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
  focus: WEB_FOCUS,
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
      const focus: GraphFocus = { kind: 'package', name: 'web' };
      const filters: GraphFilters = { hidden: new Set(), focus, depth: 2, tags: new Set(['ui']) };
      const expected: RestoredControls = { filters, search: 'we', isOpen: false, isGrouped: false };

      const restored = restoredFilters(STATE, GRAPH);

      expect(restored).toStrictEqual(expected);
    });
  });

  it('GIVEN names that are object keys WHEN restored THEN they are kept as set members', () => {
    const constructorFocus: GraphFocus = { kind: 'package', name: 'constructor' };

    const restored = restoredFilters({ ...STATE, hidden: ['__proto__'], focus: constructorFocus }, GRAPH);

    expect(restored.filters.hidden).toStrictEqual(new Set(['__proto__']));
    expect(restored.filters.focus).toStrictEqual(constructorFocus);
  });
});

describe('FEATURE: restoredFilters focus', () => {
  it.each([
    ['a known package', GRAPH, WEB_FOCUS, WEB_FOCUS],
    ['an unknown package', GRAPH, GHOST_FOCUS, null],
    ['a folder with packages', GRAPH, APPS_FOCUS, APPS_FOCUS],
    ['an unknown folder', GRAPH, ZZZ_FOCUS, null],
    ['the root folder with a root package', ROOTED, ROOT_FOCUS, ROOT_FOCUS],
    ['the root folder without a root package', GRAPH, ROOT_FOCUS, null],
    ['the folder __proto__', GRAPH, PROTO_FOLDER_FOCUS, null]
  ])('GIVEN a saved focus on %s WHEN restored THEN the focus is %j', (_name, graph, saved, expected) => {
    const restored = restoredFilters({ ...STATE, focus: saved }, graph);

    expect(restored.filters.focus).toStrictEqual(expected);
  });

  it('GIVEN a saved depth WHEN restored THEN the filters carry it', () => {
    const restored = restoredFilters({ ...STATE, depth: 4 }, GRAPH);

    expect(restored.filters.depth).toBe(4);
  });

  it('GIVEN an old saved focus string and depth WHEN read and restored THEN it is a package focus at that depth', () => {
    const saved = readGraphViewState({ ...STATE, focus: 'web', depth: 2 });
    const state = saved ?? STATE;

    const restored = restoredFilters(state, GRAPH);

    expect(restored.filters.focus).toStrictEqual({ kind: 'package', name: 'web' });
    expect(restored.filters.depth).toBe(2);
  });

  it('GIVEN a folder focus WHEN restored THEN its hidden names are kept', () => {
    const restored = restoredFilters({ ...STATE, focus: APPS_FOCUS }, GRAPH);

    expect(restored.filters.hidden).toStrictEqual(new Set(['web']));
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
    const filters: GraphFilters = { hidden: new Set(), focus: null, depth: 1, tags: new Set() };

    const fields = controlsFieldsOf(filters, '', true, isGrouped);

    expect(fields.grouped).toBe(isGrouped);
  });

  it('GIVEN hidden names, a focus and tags WHEN saved THEN the fields list them and carry the focus and depth', () => {
    const focus: GraphFocus = { kind: 'package', name: 'web' };
    const filters: GraphFilters = { hidden: new Set(['api']), focus, depth: 2, tags: new Set(['ui']) };

    const fields = controlsFieldsOf(filters, 'we', false, true);

    expect(fields).toStrictEqual({
      controlsOpen: false,
      search: 'we',
      depth: 2,
      hidden: ['api'],
      focus,
      tags: ['ui'],
      grouped: true
    });
  });

  it('GIVEN no focus WHEN saved THEN the focus is null', () => {
    const filters: GraphFilters = { hidden: new Set(), focus: null, depth: 1, tags: new Set() };

    const fields = controlsFieldsOf(filters, '', true, false);

    expect(fields.focus).toBeNull();
  });
});
