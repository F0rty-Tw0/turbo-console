import { join } from 'node:path';

import type { TsconfigPaths } from '@turbo-console/core';
import type { ImportVia } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { importMatchOf } from './import-match.util.ts';
import type { ImportEdge } from '../common/import-match.type.ts';
import { IMPORT_ROOT, SOURCE_DIR, TARGET_DIR, TARGET_NAME } from '../test/common/import-edge.const.ts';
import { IMPORT_EDGE_STUB } from '../test/stubs/import-edge.stub.ts';
import { aliasPathsOf } from '../test/utils/import-scan.spec.util.ts';

type AliasRow = {
  readonly label: string;
  readonly tsconfigPaths: TsconfigPaths | null;
  readonly specifier: string;
  readonly edge: ImportEdge;
  readonly via: ImportVia | null;
};

const FROM = join(SOURCE_DIR, 'src');

const edgeOf = (patch: Partial<ImportEdge>): ImportEdge => {
  const edge: ImportEdge = { ...IMPORT_EDGE_STUB, ...patch };

  return edge;
};

const ROOT_EDGE = edgeOf({ targetDir: null });
const NESTED_EDGE = edgeOf({ sourceDir: join(TARGET_DIR, 'plugin') });

const EXACT_PATHS = aliasPathsOf({ '@ui': ['packages/b/src/index.ts'] });
const WILDCARD_PATHS = aliasPathsOf({ '@ui/*': ['packages/b/src/*'] });
const OWN_PREFIX_PATHS = aliasPathsOf({ '@ui/*': ['packages/b/src/*'], '@ui/own/*': ['packages/a/src/*'] });
const OUTSIDE_PATHS = aliasPathsOf({ '@ui/*': ['packages/c/*'] });
const TWO_TARGET_PATHS = aliasPathsOf({ '@ui/*': ['packages/c/*', 'packages/b/*'] });
const DOT_PATHS = aliasPathsOf({ './*': ['packages/b/*'] });
const SLASH_PATHS = aliasPathsOf({ '/*': ['packages/b/*'] });
const NAMED_PATHS = aliasPathsOf({ [TARGET_NAME]: ['packages/b/src/index.ts'] });
const NESTED_PATHS = aliasPathsOf({ '~/*': ['packages/b/plugin/src/*'] });
const CATCH_ALL_PATHS = aliasPathsOf({ '*': ['packages/b/types/*'] });

const ALIAS_ROWS: AliasRow[] = [
  { label: 'an exact key maps into B', tsconfigPaths: EXACT_PATHS, specifier: '@ui', edge: IMPORT_EDGE_STUB, via: 'alias' },
  {
    label: 'a wildcard key maps into B',
    tsconfigPaths: WILDCARD_PATHS,
    specifier: '@ui/button',
    edge: IMPORT_EDGE_STUB,
    via: 'alias'
  },
  {
    label: 'the longest prefix maps into A',
    tsconfigPaths: OWN_PREFIX_PATHS,
    specifier: '@ui/own/x',
    edge: IMPORT_EDGE_STUB,
    via: null
  },
  { label: 'a key maps outside B', tsconfigPaths: OUTSIDE_PATHS, specifier: '@ui/x', edge: IMPORT_EDGE_STUB, via: null },
  {
    label: 'one of two targets maps into B',
    tsconfigPaths: TWO_TARGET_PATHS,
    specifier: '@ui/x',
    edge: IMPORT_EDGE_STUB,
    via: 'alias'
  },
  { label: 'TS treats the name as relative', tsconfigPaths: DOT_PATHS, specifier: './x', edge: IMPORT_EDGE_STUB, via: null },
  { label: 'TS treats the name as relative', tsconfigPaths: CATCH_ALL_PATHS, specifier: '.\\x', edge: IMPORT_EDGE_STUB, via: null },
  { label: 'TS treats the name as relative', tsconfigPaths: CATCH_ALL_PATHS, specifier: '..\\x', edge: IMPORT_EDGE_STUB, via: null },
  { label: 'TS treats the name as relative', tsconfigPaths: CATCH_ALL_PATHS, specifier: '.', edge: IMPORT_EDGE_STUB, via: null },
  {
    label: 'only a leading dot counts as relative',
    tsconfigPaths: CATCH_ALL_PATHS,
    specifier: 'x./y',
    edge: IMPORT_EDGE_STUB,
    via: 'alias'
  },
  {
    label: 'TS applies a /* key to an absolute name',
    tsconfigPaths: SLASH_PATHS,
    specifier: '/x',
    edge: IMPORT_EDGE_STUB,
    via: 'alias'
  },
  { label: 'rule 1 and rule 4 both match', tsconfigPaths: NAMED_PATHS, specifier: TARGET_NAME, edge: IMPORT_EDGE_STUB, via: 'name' },
  { label: 'B is the root package', tsconfigPaths: WILDCARD_PATHS, specifier: '@ui/x', edge: ROOT_EDGE, via: null },
  { label: 'the target is a file of nested A', tsconfigPaths: NESTED_PATHS, specifier: '~/x', edge: NESTED_EDGE, via: null },
  { label: 'a catch-all key maps into B', tsconfigPaths: CATCH_ALL_PATHS, specifier: 'react', edge: IMPORT_EDGE_STUB, via: 'alias' }
];

describe('FEATURE: import specifier to dependency edge', () => {
  describe('GIVEN B named @company/ui', () => {
    it.each([
      ['@company/ui', 'name'],
      ['@company/ui/button', 'name'],
      ['@company/ui/icon.svg?raw', 'name'],
      ['@company/ui-kit', null],
      ['@company/uix/a', null],
      ['@Company/ui', null],
      ['@company', null],
      ['@company/ui?raw', null]
    ])('WHEN %j is imported from A/src THEN via is %s', (specifier, expected) => {
      const via = importMatchOf(specifier, FROM, IMPORT_EDGE_STUB, null);

      expect(via).toBe(expected);
    });
  });

  describe("GIVEN A's package.json aliases B as ui-alias", () => {
    it.each([
      ['ui-alias', 'name'],
      ['ui-alias/x', 'name'],
      ['ui-aliased', null]
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ names: ['@company/ui', 'ui-alias'] });

      const via = importMatchOf(specifier, FROM, edge, null);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN relative specifiers from A/src', () => {
    it.each([
      ['../../b/src/x', 'relative'],
      ['../../b', 'relative'],
      ['./x', null],
      ['../index', null],
      ['.', null],
      ['..', null],
      ['../../c/x', null],
      ['../../bx/x', null],
      ['../../../outside', null],
      [join(TARGET_DIR, 'x'), null],
      ['node:fs', null]
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const via = importMatchOf(specifier, FROM, IMPORT_EDGE_STUB, null);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN B is the root package', () => {
    it.each([
      ['./x', null],
      ['../../x', null],
      ['root-pkg/x', 'name']
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ names: ['root-pkg'], targetDir: null });

      const via = importMatchOf(specifier, FROM, edge, null);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN A is nested in B', () => {
    it.each([
      ['./x', null],
      ['..', null],
      ['../../src/x', 'relative'],
      ['../..', 'relative']
    ])('WHEN %j is imported from a file under A/src THEN via is %s', (specifier, expected) => {
      const sourceDir = join(TARGET_DIR, 'plugin');

      const via = importMatchOf(specifier, join(sourceDir, 'src'), edgeOf({ sourceDir }), null);

      expect(via).toBe(expected);
    });

    it.each([
      ['.', null],
      ['..', 'relative']
    ])('WHEN %j is imported from a file at the top of A THEN via is %s', (specifier, expected) => {
      const sourceDir = join(TARGET_DIR, 'plugin');

      const via = importMatchOf(specifier, sourceDir, edgeOf({ sourceDir }), null);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN B is nested in A', () => {
    it.each([
      ['../sub/x', 'relative'],
      ['./x', null]
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ targetDir: join(SOURCE_DIR, 'sub') });

      const via = importMatchOf(specifier, FROM, edge, null);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN A is the root package', () => {
    it.each([
      ['./packages/b/x', 'relative'],
      ['./scripts/x', null]
    ])('WHEN %j is imported from the root THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ sourceDir: IMPORT_ROOT });

      const via = importMatchOf(specifier, IMPORT_ROOT, edge, null);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN a specifier that is a name and looks relative', () => {
    it('WHEN ./@company/ui is imported THEN via is null', () => {
      const via = importMatchOf('./@company/ui', FROM, IMPORT_EDGE_STUB, null);

      expect(via).toBeNull();
    });
  });

  describe('GIVEN A without tsconfig paths', () => {
    it('WHEN @ui/x is imported THEN via is null', () => {
      const via = importMatchOf('@ui/x', FROM, IMPORT_EDGE_STUB, null);

      expect(via).toBeNull();
    });
  });

  describe('GIVEN tsconfig paths of A', () => {
    it.each(ALIAS_ROWS)('WHEN $specifier is imported and $label THEN via is $via', ({ tsconfigPaths, specifier, edge, via }) => {
      const matched = importMatchOf(specifier, FROM, edge, tsconfigPaths);

      expect(matched).toBe(via);
    });
  });
});
