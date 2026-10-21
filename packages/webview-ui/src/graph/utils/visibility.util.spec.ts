import { describe, expect, it } from 'vitest';

import { visibleOf } from './visibility.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFilters, GraphFocus } from '../common/graph-filters.type.ts';

type FilterSpec = {
  readonly hidden?: string[];
  readonly focus?: GraphFocus;
  readonly tags?: string[];
};

const pkgOf = (name: string, path: string, tags: string[] = []): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags };

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

const sortedVisible = (packages: GraphPackage[], edges: GraphEdge[], spec: FilterSpec): string[] => {
  const visible = visibleOf(packages, edges, filtersOf(spec));
  const names = [...visible];

  return names.sort();
};

const SHOP: GraphPackage[] = [
  pkgOf('web', 'apps/web', ['app', 'ui']),
  pkgOf('admin', 'apps/admin', ['app']),
  pkgOf('ui', 'packages/ui', ['ui']),
  pkgOf('forms', 'packages/forms', ['ui']),
  pkgOf('core', 'packages/core', ['lib']),
  pkgOf('config', 'packages/config', ['lib']),
  pkgOf('base', 'packages/base'),
  pkgOf('docs', 'docs')
];

const SHOP_EDGES: GraphEdge[] = [
  edgeOf('web', 'ui'),
  edgeOf('web', 'forms'),
  edgeOf('admin', 'ui'),
  edgeOf('ui', 'core'),
  edgeOf('forms', 'core'),
  edgeOf('core', 'config'),
  edgeOf('config', 'base')
];

const ALL = ['admin', 'base', 'config', 'core', 'docs', 'forms', 'ui', 'web'];

const UI_DEPTH_1: GraphFocus = { name: 'ui', depth: 1 };

const UI_DEPTH_2: GraphFocus = { name: 'ui', depth: 2 };

const CORE_DEPTH_1: GraphFocus = { name: 'core', depth: 1 };

const CORE_DEPTH_2: GraphFocus = { name: 'core', depth: 2 };

const GHOST_DEPTH_2: GraphFocus = { name: 'ghost', depth: 2 };

const WEB_DEPTH_5: GraphFocus = { name: 'web', depth: 5 };

const A_DEPTH_5: GraphFocus = { name: 'a', depth: 5 };

const PROTO_DEPTH_1: GraphFocus = { name: '__proto__', depth: 1 };

const PROTO: GraphPackage[] = [
  pkgOf('__proto__', 'x/__proto__', ['constructor']),
  pkgOf('constructor', 'x/constructor', ['__proto__']),
  pkgOf('plain', 'x/plain')
];

const PROTO_EDGES: GraphEdge[] = [edgeOf('__proto__', 'constructor')];

describe('FEATURE: visibleOf', () => {
  describe('GIVEN the shop packages', () => {
    it.each([
      ['no filter', {}, ALL],
      ['core unchecked', { hidden: ['core'] }, ['admin', 'base', 'config', 'docs', 'forms', 'ui', 'web']],
      ['packages/ folder unchecked', { hidden: ['ui', 'forms', 'core', 'config', 'base'] }, ['admin', 'docs', 'web']],
      ['focus ui depth 1', { focus: UI_DEPTH_1 }, ['admin', 'core', 'ui', 'web']],
      ['focus ui depth 2', { focus: UI_DEPTH_2 }, ['admin', 'config', 'core', 'ui', 'web']],
      ['focus core depth 1', { focus: CORE_DEPTH_1 }, ['config', 'core', 'forms', 'ui']],
      ['focus core depth 2', { focus: CORE_DEPTH_2 }, ['admin', 'base', 'config', 'core', 'forms', 'ui', 'web']],
      ['tag lib', { tags: ['lib'] }, ['config', 'core']],
      ['tag ui', { tags: ['ui'] }, ['forms', 'ui', 'web']],
      ['tags app and lib', { tags: ['app', 'lib'] }, ['admin', 'config', 'core', 'web']],
      ['focus ui/1 + tag lib (excludes the focus)', { focus: UI_DEPTH_1, tags: ['lib'] }, ['core', 'ui']],
      ['focus ui/1 + ui, web unchecked', { focus: UI_DEPTH_1, hidden: ['ui', 'web'] }, ['admin', 'core', 'ui']],
      [
        'focus core/2 + ui unchecked (depth-2 web, admin stay)',
        { focus: CORE_DEPTH_2, hidden: ['ui'] },
        ['admin', 'base', 'config', 'core', 'forms', 'web']
      ]
    ])('WHEN %s THEN the visible names are exact', (_label, spec, expected) => {
      const visible = sortedVisible(SHOP, SHOP_EDGES, spec);

      expect(visible).toStrictEqual(expected);
    });

    it('WHEN the focus names no package THEN nothing is narrowed', () => {
      const visible = sortedVisible(SHOP, SHOP_EDGES, { focus: GHOST_DEPTH_2 });

      expect(visible).toStrictEqual(ALL);
    });
  });

  describe('GIVEN an edge to a name that is no package', () => {
    it('WHEN web is focused deeply THEN the unknown name is not visible', () => {
      const edges = [...SHOP_EDGES, edgeOf('web', 'ghost')];

      const visible = sortedVisible(SHOP, edges, { focus: WEB_DEPTH_5 });

      expect(visible).not.toContain('ghost');
    });
  });

  describe('GIVEN two packages that depend on each other', () => {
    it('WHEN a is focused deeply THEN the walk ends with both', () => {
      const packages = [pkgOf('a', 'x/a'), pkgOf('b', 'x/b')];
      const edges = [edgeOf('a', 'b'), edgeOf('b', 'a')];

      const visible = sortedVisible(packages, edges, { focus: A_DEPTH_5 });

      expect(visible).toStrictEqual(['a', 'b']);
    });
  });

  describe('GIVEN names and tags that are Object.prototype keys', () => {
    it.each([
      ['no filter', {}, ['__proto__', 'constructor', 'plain']],
      ['constructor unchecked', { hidden: ['constructor'] }, ['__proto__', 'plain']],
      ['focus __proto__ depth 1', { focus: PROTO_DEPTH_1 }, ['__proto__', 'constructor']],
      ['tag __proto__', { tags: ['__proto__'] }, ['constructor']],
      ['tag constructor', { tags: ['constructor'] }, ['__proto__']]
    ])('WHEN %s THEN the visible names are exact', (_label, spec, expected) => {
      const visible = sortedVisible(PROTO, PROTO_EDGES, spec);

      expect(visible).toStrictEqual(expected);
    });
  });
});
