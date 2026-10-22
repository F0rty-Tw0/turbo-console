import { describe, expect, it } from 'vitest';

import { visibleOf } from './visibility.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';

type FilterSpec = {
  readonly hidden?: string[];
  readonly focus?: GraphFocus;
  readonly depth?: number;
  readonly tags?: string[];
};

const pkgOf = (name: string, path: string, tags: string[] = []): GraphPackage => {
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
  const depth = spec.depth ?? 1;
  const filters: GraphFilters = { hidden, focus, depth, tags };

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

const UI: GraphFocus = { kind: 'package', name: 'ui' };

const CORE: GraphFocus = { kind: 'package', name: 'core' };

const GHOST: GraphFocus = { kind: 'package', name: 'ghost' };

const WEB: GraphFocus = { kind: 'package', name: 'web' };

const A: GraphFocus = { kind: 'package', name: 'a' };

const PROTO_FOCUS: GraphFocus = { kind: 'package', name: '__proto__' };

const APPS: GraphFocus = { kind: 'folder', folder: 'apps' };

const PACKAGES: GraphFocus = { kind: 'folder', folder: 'packages' };

const ROOT_FOLDER: GraphFocus = { kind: 'folder', folder: '' };

const NO_FOLDER: GraphFocus = { kind: 'folder', folder: 'nope' };

const PROTO_FOLDER: GraphFocus = { kind: 'folder', folder: '__proto__' };

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
      ['focus ui depth 1', { focus: UI, depth: 1 }, ['admin', 'core', 'ui', 'web']],
      ['focus ui depth 2', { focus: UI, depth: 2 }, ['admin', 'config', 'core', 'ui', 'web']],
      ['focus core depth 1', { focus: CORE, depth: 1 }, ['config', 'core', 'forms', 'ui']],
      ['focus core depth 2', { focus: CORE, depth: 2 }, ['admin', 'base', 'config', 'core', 'forms', 'ui', 'web']],
      ['tag lib', { tags: ['lib'] }, ['config', 'core']],
      ['tag ui', { tags: ['ui'] }, ['forms', 'ui', 'web']],
      ['tags app and lib', { tags: ['app', 'lib'] }, ['admin', 'config', 'core', 'web']],
      ['focus ui/1 + tag lib (excludes the focus)', { focus: UI, depth: 1, tags: ['lib'] }, ['core', 'ui']],
      ['focus ui/1 + ui, web unchecked', { focus: UI, depth: 1, hidden: ['ui', 'web'] }, ['admin', 'core', 'ui']],
      [
        'focus core/2 + ui unchecked (depth-2 web, admin stay)',
        { focus: CORE, depth: 2, hidden: ['ui'] },
        ['admin', 'base', 'config', 'core', 'forms', 'web']
      ]
    ])('WHEN %s THEN the visible names are exact', (_label, spec, expected) => {
      const visible = sortedVisible(SHOP, SHOP_EDGES, spec);

      expect(visible).toStrictEqual(expected);
    });

    it('WHEN the focus names no package THEN nothing is narrowed', () => {
      const visible = sortedVisible(SHOP, SHOP_EDGES, { focus: GHOST, depth: 2 });

      expect(visible).toStrictEqual(ALL);
    });
  });

  describe('GIVEN a folder focus on the shop packages', () => {
    it.each([
      ['folder apps', { focus: APPS }, ['admin', 'web']],
      ['folder packages', { focus: PACKAGES }, ['base', 'config', 'core', 'forms', 'ui']],
      ['folder apps + admin unchecked', { focus: APPS, hidden: ['admin'] }, ['web']],
      ['folder apps + both unchecked (no focus-stays rule)', { focus: APPS, hidden: ['admin', 'web'] }, []],
      ['folder apps + tag ui', { focus: APPS, tags: ['ui'] }, ['web']],
      ['folder packages + tag lib', { focus: PACKAGES, tags: ['lib'] }, ['config', 'core']],
      ['the root folder', { focus: ROOT_FOLDER }, ['docs']],
      ['an unknown folder', { focus: NO_FOLDER }, ALL],
      ['folder apps at depth 3', { focus: APPS, depth: 3 }, ['admin', 'web']],
      ['folder apps at depth 0', { focus: APPS, depth: 0 }, ['admin', 'web']]
    ])('WHEN %s THEN the visible names are exact', (_label, spec, expected) => {
      const visible = sortedVisible(SHOP, SHOP_EDGES, spec);

      expect(visible).toStrictEqual(expected);
    });

    it('WHEN the folder is __proto__ THEN only its package is visible', () => {
      const packages = [pkgOf('a', '__proto__/a'), pkgOf('b', 'x/b')];

      const visible = sortedVisible(packages, [], { focus: PROTO_FOLDER });

      expect(visible).toStrictEqual(['a']);
    });
  });

  describe('GIVEN an edge to a name that is no package', () => {
    it('WHEN web is focused deeply THEN the unknown name is not visible', () => {
      const edges = [...SHOP_EDGES, edgeOf('web', 'ghost')];

      const visible = sortedVisible(SHOP, edges, { focus: WEB, depth: 5 });

      expect(visible).not.toContain('ghost');
    });
  });

  describe('GIVEN two packages that depend on each other', () => {
    it('WHEN a is focused deeply THEN the walk ends with both', () => {
      const packages = [pkgOf('a', 'x/a'), pkgOf('b', 'x/b')];
      const edges = [edgeOf('a', 'b'), edgeOf('b', 'a')];

      const visible = sortedVisible(packages, edges, { focus: A, depth: 5 });

      expect(visible).toStrictEqual(['a', 'b']);
    });
  });

  describe('GIVEN names and tags that are Object.prototype keys', () => {
    it.each([
      ['no filter', {}, ['__proto__', 'constructor', 'plain']],
      ['constructor unchecked', { hidden: ['constructor'] }, ['__proto__', 'plain']],
      ['focus __proto__ depth 1', { focus: PROTO_FOCUS, depth: 1 }, ['__proto__', 'constructor']],
      ['tag __proto__', { tags: ['__proto__'] }, ['constructor']],
      ['tag constructor', { tags: ['constructor'] }, ['__proto__']]
    ])('WHEN %s THEN the visible names are exact', (_label, spec, expected) => {
      const visible = sortedVisible(PROTO, PROTO_EDGES, spec);

      expect(visible).toStrictEqual(expected);
    });
  });
});
