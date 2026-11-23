import { describe, expect, expectTypeOf, it } from 'vitest';

import { moduleSitesModelOf } from './module-sites-model.util.ts';
import type { ModuleSite, ModuleSitesFound } from '../../bridge/common/graph-module-sites.type.ts';
import {
  LIMIT_NOTES,
  NO_IMPORTS_WORD,
  SCANNING_AGAIN_TEXT,
  SCANNING_STATUS_TEXT,
  SCAN_FAILED_STATUS_TEXT,
  SCAN_FAILED_WORD
} from '../common/details-imports.const.ts';
import type { ImportRowModel, ImportsStatus, ImportsViewModel } from '../common/details-imports.type.ts';
import type { ModuleDetailsView, ModuleSitesState } from '../common/module-details.type.ts';

type SitesList = 'imports' | 'importedBy' | 'link';

type GroupKeys = [string, string[]];

type GroupSizes = [string, number];

type SiteTarget = ModuleSite['target'];

const STUB_X_TARGET: SiteTarget = { kind: 'stub', name: '@s/x' };

const STUB_D_TARGET: SiteTarget = { kind: 'stub', name: '@s/d' };

const STUB_Z_TARGET: SiteTarget = { kind: 'stub', name: '@s/z' };

const FILE_B_TARGET: SiteTarget = { kind: 'file', path: 'src/lib/b.ts' };

const FILE_SRC_A_TARGET: SiteTarget = { kind: 'file', path: 'src/a.ts' };

const FILE_A_TARGET: SiteTarget = { kind: 'file', path: 'a.ts' };

const STUB_X: ModuleSite = {
  file: 'src/a.ts',
  line: 0,
  text: "import { x } from '@s/x';",
  kind: 'static',
  isType: false,
  target: STUB_X_TARGET
};

const TYPE_B: ModuleSite = {
  file: 'src/a.ts',
  line: 3,
  text: "import type { B } from './lib/b.ts';",
  kind: 'static',
  isType: true,
  target: FILE_B_TARGET
};

const REEXPORT_B: ModuleSite = {
  file: 'src/c.ts',
  line: 1,
  text: "export * from './lib/b.ts';",
  kind: 'reexport',
  isType: false,
  target: FILE_B_TARGET
};

const DYNAMIC_D: ModuleSite = {
  file: 'src/c.ts',
  line: 4,
  text: "const d = await import('@s/d');",
  kind: 'dynamic',
  isType: false,
  target: STUB_D_TARGET
};

const INDEX_A: ModuleSite = {
  file: 'index.ts',
  line: 0,
  text: "import './src/a.ts';",
  kind: 'static',
  isType: false,
  target: FILE_SRC_A_TARGET
};

const REQUIRE_A: ModuleSite = {
  file: 'src/ui/d.ts',
  line: 2,
  text: "require('../a.ts');",
  kind: 'require',
  isType: false,
  target: FILE_SRC_A_TARGET
};

const FOUND: ModuleSitesFound = {
  kind: 'found',
  imports: [STUB_X, TYPE_B, REEXPORT_B, DYNAMIC_D],
  importsTotal: 4,
  importedBy: [INDEX_A, REQUIRE_A],
  importedByTotal: 2,
  limit: null
};

const FOUND_STATE: ModuleSitesState = { kind: 'found', result: FOUND };

const NONE_RESULT: ModuleSitesFound = { ...FOUND, importedBy: [], importedByTotal: 0 };

const NONE_STATE: ModuleSitesState = { kind: 'found', result: NONE_RESULT };

const SCANNING_STATE: ModuleSitesState = { kind: 'scanning', previous: null };

const SCANNING_AGAIN_STATE: ModuleSitesState = { kind: 'scanning', previous: FOUND };

const FAILED_STATE: ModuleSitesState = { kind: 'failed' };

const NONE_STATUS: ImportsStatus = { icon: 'info', word: NO_IMPORTS_WORD };

const FAILED_STATUS: ImportsStatus = { icon: 'warning', word: SCAN_FAILED_WORD };

const TYPE_ROW: ImportRowModel = {
  key: 'src/a.ts:3',
  file: 'src/a.ts',
  line: 3,
  number: '4',
  text: "import type { B } from './lib/b.ts';",
  tags: ['type'],
  label: "Open src/a.ts at line 4: import type { B } from './lib/b.ts';"
};

const capSiteOf = (index: number): ModuleSite => {
  const site: ModuleSite = { ...STUB_X, file: `src/f${String(index).padStart(3, '0')}.ts` };

  return site;
};

const CAP_SITES: ModuleSite[] = Array.from({ length: 200 }, (_unused, index) => capSiteOf(index));

const CAP_RESULT: ModuleSitesFound = { ...FOUND, imports: CAP_SITES, importsTotal: 350, limit: 'time' };

const CAP_STATE: ModuleSitesState = { kind: 'found', result: CAP_RESULT };

const STUB_Z: ModuleSite = { ...STUB_X, target: STUB_Z_TARGET };

const FILE_A: ModuleSite = { ...STUB_X, target: FILE_A_TARGET };

const foldSiteOf = (index: number): ModuleSite => {
  const shape = index % 2 === 0 ? STUB_Z : FILE_A;
  const site: ModuleSite = { ...shape, file: `src/f${String(index).padStart(2, '0')}.ts` };

  return site;
};

const FOLD_SITES: ModuleSite[] = Array.from({ length: 25 }, (_unused, index) => foldSiteOf(index));

const FOLD_RESULT: ModuleSitesFound = { ...FOUND, imports: FOLD_SITES, importsTotal: 25 };

const FOLD_STATE: ModuleSitesState = { kind: 'found', result: FOLD_RESULT };

const foldKeysOf = (indices: number[]): string[] => indices.map((index) => `src/f${String(index).padStart(2, '0')}.ts:0`);

const EVEN_KEYS: string[] = foldKeysOf([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);

const ODD_KEYS: string[] = foldKeysOf([1, 3, 5, 7, 9, 11, 13]);

const groupKeysOf = (model: ImportsViewModel): GroupKeys[] =>
  model.groups.map((group) => [group.file, group.rows.map((row) => row.key)]);

const groupSizesOf = (model: ImportsViewModel): GroupSizes[] => model.groups.map((group) => [group.file, group.rows.length]);

const tagsListOf = (model: ImportsViewModel): string[][] => model.groups.flatMap((group) => group.rows.map((row) => row.tags));

const modelOf = (state: ModuleSitesState, list: SitesList, heading = 'Imports', isOpen = false): ImportsViewModel =>
  moduleSitesModelOf(state, list, heading, isOpen);

const headOf = (model: ImportsViewModel): unknown[] => {
  const head = [
    model.heading,
    model.status,
    model.statusText,
    model.isScanning,
    model.lines,
    model.more,
    model.notes,
    model.scanLabel
  ];

  return head;
};

describe('FEATURE: module sites Details model', () => {
  describe('GIVEN found sites of src/a.ts and src/c.ts and two importers of src/a.ts', () => {
    it.each<[string, SitesList, GroupKeys[]]>([
      [
        'imports group by target label, by code unit',
        'imports',
        [
          ['@s/d', ['src/c.ts:4']],
          ['@s/x', ['src/a.ts:0']],
          ['src/lib/b.ts', ['src/a.ts:3', 'src/c.ts:1']]
        ]
      ],
      [
        'a link groups the same sites by importing file',
        'link',
        [
          ['src/a.ts', ['src/a.ts:0', 'src/a.ts:3']],
          ['src/c.ts', ['src/c.ts:1', 'src/c.ts:4']]
        ]
      ],
      [
        'imported-by groups by importing file',
        'importedBy',
        [
          ['index.ts', ['index.ts:0']],
          ['src/ui/d.ts', ['src/ui/d.ts:2']]
        ]
      ]
    ])('WHEN %s THEN the groups are in that order', (_name, list, groups) => {
      expect(groupKeysOf(modelOf(FOUND_STATE, list))).toStrictEqual(groups);
    });

    it('WHEN the imports are modelled THEN the type-only row keeps its file, its line and a type tag', () => {
      const rows = modelOf(FOUND_STATE, 'imports').groups.flatMap((group) => group.rows);

      expect(rows.find((row) => row.key === 'src/a.ts:3')).toStrictEqual(TYPE_ROW);
    });

    it.each<[SitesList, string[][]]>([
      ['imports', [['dynamic'], [], ['type'], ['re-export']]],
      ['importedBy', [[], ['require']]]
    ])('WHEN the %s rows are modelled THEN their tags in display order are %j', (list, tags) => {
      expect(tagsListOf(modelOf(FOUND_STATE, list))).toStrictEqual(tags);
    });

    it('WHEN the imports are modelled THEN the head counts 4 and names the heading in the scan label', () => {
      expect(headOf(modelOf(FOUND_STATE, 'imports'))).toStrictEqual([
        'Imports (4)',
        null,
        '4 imports found',
        false,
        [],
        null,
        [],
        'Scan the files again: Imports'
      ]);
    });
  });

  describe('GIVEN a found answer with no importers', () => {
    it('WHEN the imported-by list is modelled THEN it reads none with no count and no groups', () => {
      const model = modelOf(NONE_STATE, 'importedBy', 'Imported by');

      expect([model.heading, model.status, model.statusText, model.groups]).toStrictEqual([
        'Imported by',
        NONE_STATUS,
        NO_IMPORTS_WORD,
        []
      ]);
    });
  });

  describe('GIVEN a first scan', () => {
    it('WHEN the imports are modelled THEN it shows the scanning line and nothing else', () => {
      const model = modelOf(SCANNING_STATE, 'imports');

      expect([model.heading, model.isScanning, model.status, model.statusText, model.lines, model.groups, model.notes]).toStrictEqual([
        'Imports',
        true,
        null,
        SCANNING_STATUS_TEXT,
        ['Scanning for imports…'],
        [],
        []
      ]);
    });
  });

  describe('GIVEN a failed scan', () => {
    it('WHEN the imports are modelled THEN it shows the failed status and no lines or groups', () => {
      const model = modelOf(FAILED_STATE, 'imports');

      expect([model.status, model.statusText, model.lines, model.groups]).toStrictEqual([
        FAILED_STATUS,
        SCAN_FAILED_STATUS_TEXT,
        [],
        []
      ]);
    });
  });

  describe('GIVEN a re-ask while the found answer shows', () => {
    it('WHEN the imports are modelled THEN it keeps the previous answer and says it scans again', () => {
      const model = modelOf(SCANNING_AGAIN_STATE, 'imports');
      const found = modelOf(FOUND_STATE, 'imports');

      expect([model.heading, model.isScanning, model.lines, model.statusText, model.groups]).toStrictEqual([
        'Imports (4)',
        true,
        [SCANNING_AGAIN_TEXT],
        '4 imports found',
        found.groups
      ]);
    });
  });

  describe('GIVEN 200 sent sites of 350 and a time limit', () => {
    it('WHEN the open imports are modelled THEN the heading counts 350 and the notes say what is shown and why', () => {
      const model = modelOf(CAP_STATE, 'imports', 'Imports', true);

      expect([model.heading, model.notes]).toStrictEqual(['Imports (350)', ['Showing 200 of 350 imports.', LIMIT_NOTES.time]]);
    });
  });

  describe('GIVEN 25 sites alternating between stub @s/z and file a.ts', () => {
    it('WHEN the folded imports are modelled THEN the first 20 in label order show and 5 more fold', () => {
      const model = modelOf(FOLD_STATE, 'imports');
      const groups: GroupKeys[] = [
        ['@s/z', EVEN_KEYS],
        ['a.ts', ODD_KEYS]
      ];

      expect([groupKeysOf(model), model.more]).toStrictEqual([groups, 'Show 5 more']);
    });

    it('WHEN the open imports are modelled THEN every site shows and nothing folds', () => {
      const model = modelOf(FOLD_STATE, 'imports', 'Imports', true);
      const sizes: GroupSizes[] = [
        ['@s/z', 13],
        ['a.ts', 12]
      ];

      expect([groupSizesOf(model), model.more]).toStrictEqual([sizes, null]);
    });
  });

  describe('GIVEN the Details view type', () => {
    // eslint-disable-next-line vitest/expect-expect -- type-only pin: the `expectTypeOf` check fails in typecheck, not at run time.
    it('WHEN its kinds are read THEN they are exactly the five views', () => {
      expectTypeOf<ModuleDetailsView['kind']>().toEqualTypeOf<'empty' | 'loading' | 'file' | 'stub' | 'link'>();
    });
  });
});
