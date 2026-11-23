import { describe, expect, it } from 'vitest';

import { moduleSitesOf } from './module-sites.util.ts';
import type { ModuleGraphInput } from '../common/module-graph.type.ts';
import type { ModuleSiteRow, ModuleSitesQuery } from '../common/module-sites.type.ts';
import { A_DIR } from '../test/common/module-dirs.const.ts';
import { importOf, moduleScanOf } from '../test/utils/module-scan.spec.util.ts';
import { dirEndOf, fileEndOf, queryOf, sitesInputOf, stubEndOf } from '../test/utils/module-sites.spec.util.ts';

type SitesRow = {
  readonly label: string;
  readonly query: ModuleSitesQuery;
  readonly imports: string[];
  readonly importedBy: string[];
};

const SITES_INPUT = sitesInputOf();
const SORT_WALKED = ['src/q.ts', 'src/p.ts', 'src/B.ts', 'src/t.ts'];
const Q_IMPORTS = [importOf('./t', { line: 5 }), importOf('./t', { line: 1 })];
const P_IMPORTS = [importOf('./t', { line: 3 })];
const B_IMPORTS = [importOf('./t')];
const SORT_IMPORTS = { 'src/q.ts': Q_IMPORTS, 'src/p.ts': P_IMPORTS, 'src/B.ts': B_IMPORTS };

const SITES_ROWS: SitesRow[] = [
  {
    label: "a file's imports and importers",
    query: queryOf(fileEndOf('src/a/x.ts'), null),
    imports: ['src/a/x.ts:0 src/a/y.ts', 'src/a/x.ts:1 src/lib/c.ts', 'src/a/x.ts:2 pkg:@s/b'],
    importedBy: ['src/ab/z.ts:0 src/a/x.ts', 'src/main.ts:0 src/a/x.ts']
  },
  {
    label: 'a dir excludes imports inside it',
    query: queryOf(dirEndOf('src/a'), null),
    imports: ['src/a/x.ts:1 src/lib/c.ts', 'src/a/x.ts:2 pkg:@s/b', 'src/a/y.ts:0 src/lib/c.ts'],
    importedBy: ['src/ab/z.ts:0 src/a/x.ts', 'src/main.ts:0 src/a/x.ts']
  },
  {
    label: 'a dir does not match its sibling src/ab',
    query: queryOf(dirEndOf('src/a'), fileEndOf('src/lib/c.ts')),
    imports: ['src/a/x.ts:1 src/lib/c.ts', 'src/a/y.ts:0 src/lib/c.ts'],
    importedBy: []
  },
  {
    label: "a stub's importers",
    query: queryOf(stubEndOf('@s/b'), null),
    imports: [],
    importedBy: ['src/a/x.ts:2 pkg:@s/b', 'src/lib/c.ts:2 pkg:@s/b']
  },
  {
    label: 'a link between dir ends',
    query: queryOf(dirEndOf('src'), dirEndOf('src/a')),
    imports: ['src/a/x.ts:0 src/a/y.ts', 'src/ab/z.ts:0 src/a/x.ts', 'src/main.ts:0 src/a/x.ts'],
    importedBy: []
  },
  {
    label: 'a link from a dir to a stub',
    query: queryOf(dirEndOf('src/a'), stubEndOf('@s/b')),
    imports: ['src/a/x.ts:2 pkg:@s/b'],
    importedBy: []
  },
  {
    label: 'a self-import is dropped',
    query: queryOf(fileEndOf('src/a/x.ts'), fileEndOf('src/a/x.ts')),
    imports: [],
    importedBy: []
  },
  {
    label: 'a target that is not walked',
    query: queryOf(fileEndOf('src/a/gone.ts'), null),
    imports: [],
    importedBy: []
  }
];

const targetTextOf = (row: ModuleSiteRow): string => (row.target.kind === 'file' ? row.target.path : `pkg:${row.target.name}`);

const textsOf = (rows: ModuleSiteRow[]): string[] => rows.map((row) => `${row.file}:${row.source.line} ${targetTextOf(row)}`);

describe('FEATURE: list the import lines behind a module end or link', () => {
  describe.each(SITES_ROWS)('GIVEN the shared fixture and $label', ({ query, imports, importedBy }) => {
    it('WHEN the sites are asked THEN imports and importedBy list exactly the expected rows', () => {
      const sites = moduleSitesOf(SITES_INPUT, query);

      expect(textsOf(sites.imports)).toStrictEqual(imports);
      expect(textsOf(sites.importedBy)).toStrictEqual(importedBy);
    });
  });

  describe('GIVEN src/q.ts importing ./t on lines 5 and 1, src/p.ts on line 3 and src/B.ts on line 0', () => {
    it('WHEN the importers of src/t.ts are asked THEN they sort by file in code-unit order, then by line', () => {
      const scan = moduleScanOf(SORT_WALKED, SORT_IMPORTS);
      const input: ModuleGraphInput = { dir: A_DIR, selfName: '@s/a', scan, others: [] };
      const sites = moduleSitesOf(input, queryOf(fileEndOf('src/t.ts'), null));

      expect(textsOf(sites.importedBy)).toStrictEqual(['src/B.ts:0 src/t.ts', 'src/p.ts:3 src/t.ts', 'src/q.ts:1 src/t.ts', 'src/q.ts:5 src/t.ts']);
    });
  });

  describe('GIVEN package a at a native win32 dir with src/a/x.ts importing ../lib/c', () => {
    it.runIf(process.platform === 'win32')('WHEN the package dir is a native win32 path THEN posix query paths still match the walked files', () => {
      const scan = moduleScanOf(['src/a/x.ts', 'src/lib/c.ts'], { 'src/a/x.ts': [importOf('../lib/c')] });
      const input: ModuleGraphInput = { dir: 'C:\\ws\\a', selfName: '@s/a', scan, others: [] };
      const byDir = moduleSitesOf(input, queryOf(dirEndOf('src/lib'), null));
      const byLink = moduleSitesOf(input, queryOf(fileEndOf('src/a/x.ts'), dirEndOf('src/lib')));

      expect(textsOf(byDir.importedBy)).toStrictEqual(['src/a/x.ts:0 src/lib/c.ts']);
      expect(textsOf(byLink.imports)).toStrictEqual(['src/a/x.ts:0 src/lib/c.ts']);
    });
  });
});
