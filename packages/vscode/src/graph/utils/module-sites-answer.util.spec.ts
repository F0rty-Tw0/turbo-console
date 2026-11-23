import { join } from 'node:path';

import type { ModuleSitesQuery, PackageImportScan, ScannedFile } from '@turbo-console/core';
import { MANIFEST_FILE_MAX, MANIFEST_LINE_MAX } from '@turbo-console/webview-ui';
import type { ModuleEnd, ModuleSite, ModuleSitesFound } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { answerModuleSites } from './module-sites-answer.util.ts';
import type { ModulesContext } from '../common/import-match.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { GRAPH_INFOS_STUB } from '../test/stubs/graph-model.stub.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';
import { frozenScanOf, importScanOf, scannedFileOf, sourceImportOf } from '../test/utils/import-scan.spec.util.ts';

type FileOnly = {
  readonly file: string;
};

type Place = {
  readonly file: string;
  readonly line: number;
};

type TextOnly = {
  readonly text: string;
};

const WEB_DIR = join(IMPORT_ROOT, 'apps', 'web');
const WEB_CTX: ModulesContext = {
  root: IMPORT_ROOT,
  packageName: 'web',
  dir: WEB_DIR,
  packages: GRAPH_INFOS_STUB,
  manifestText: null
};
const LONG = `${'x'.repeat(MANIFEST_FILE_MAX + 1)}.ts`;
const T = 't'.repeat(MANIFEST_FILE_MAX);
const LONG_NAME = 'n'.repeat(215);
const LONG_PACKAGE = graphPackageOf(LONG_NAME, 'packages/long');
const LONG_NAME_CTX: ModulesContext = { ...WEB_CTX, packages: [...GRAPH_INFOS_STUB, LONG_PACKAGE] };
const HUB_COUNT = 250;
const SENT_MAX = 200;
const X_WALKED = ['src/x.ts', 'src/y.ts', 'src/z.ts'];
const X_FILE = scannedFileOf('src/x.ts', [sourceImportOf('./y', 0), sourceImportOf('a', 1)]);
const Z_TYPE_IMPORT = sourceImportOf('./x', 2, { isType: true });
const Z_FILE = scannedFileOf('src/z.ts', [Z_TYPE_IMPORT]);
const X_SCAN = importScanOf([X_FILE, Z_FILE], { walkedFiles: X_WALKED });
const X_END: ModuleEnd = { kind: 'file', path: 'src/x.ts' };
const Y_END: ModuleEnd = { kind: 'file', path: 'src/y.ts' };
const HUB_END: ModuleEnd = { kind: 'file', path: 'src/hub.ts' };
const SRC_END: ModuleEnd = { kind: 'dir', path: 'src' };
const A_END: ModuleEnd = { kind: 'stub', name: 'a' };
const X_QUERY: ModuleSitesQuery = { from: X_END, to: null };
const Y_QUERY: ModuleSitesQuery = { from: Y_END, to: null };
const HUB_QUERY: ModuleSitesQuery = { from: HUB_END, to: null };
const DIR_TO_STUB_QUERY: ModuleSitesQuery = { from: SRC_END, to: A_END };
const HUB_FILES = Array.from({ length: HUB_COUNT }, (_value, index) => `src/f${index}.ts`);
const X_TO_Y: ModuleSite = { file: 'src/x.ts', line: 0, text: "import x from './y';", kind: 'static', isType: false, target: Y_END };
const X_TO_A: ModuleSite = { file: 'src/x.ts', line: 1, text: "import x from 'a';", kind: 'static', isType: false, target: A_END };
const Z_TO_X: ModuleSite = { file: 'src/z.ts', line: 2, text: "import x from './x';", kind: 'static', isType: true, target: X_END };
const X_IMPORTS = [X_TO_Y, X_TO_A];
const X_IMPORTED_BY = [Z_TO_X];
const FOUND_X: ModuleSitesFound = {
  kind: 'found',
  imports: X_IMPORTS,
  importsTotal: 2,
  importedBy: X_IMPORTED_BY,
  importedByTotal: 1,
  limit: null
};

const fileOnlyOf = (file: string): FileOnly => {
  const only: FileOnly = { file };

  return only;
};

const textOnlyOf = (text: string): TextOnly => {
  const only: TextOnly = { text };

  return only;
};

const placeOf = (file: string, line: number): Place => {
  const place: Place = { file, line };

  return place;
};

const hubScanOf = (): PackageImportScan => {
  const hubFileOf = (file: string): ScannedFile => scannedFileOf(file, [sourceImportOf('./hub', 0)]);
  const files = HUB_FILES.map(hubFileOf);

  return importScanOf(files, { walkedFiles: [...HUB_FILES, 'src/hub.ts'] });
};

describe('FEATURE: module sites answer of one package scan', () => {
  describe('GIVEN a file with two imports and one importer', () => {
    it('WHEN the file is asked THEN both lists are sent whole with their totals', () => {
      const result = answerModuleSites(X_SCAN, WEB_CTX, X_QUERY);

      expect(result).toStrictEqual(FOUND_X);
    });
  });

  describe('GIVEN a link from a dir to a stub', () => {
    it('WHEN the link is asked THEN only the line-1 site is sent and importedBy is empty', () => {
      const imports = [placeOf('src/x.ts', 1)];

      const result = answerModuleSites(X_SCAN, WEB_CTX, DIR_TO_STUB_QUERY);

      expect(result).toMatchObject({ imports, importsTotal: 1, importedBy: [], importedByTotal: 0 });
    });
  });

  describe('GIVEN 250 files that each import the hub', () => {
    it('WHEN the hub is asked THEN the first 200 by file are sent and all 250 counted', () => {
      const expected = HUB_FILES.toSorted().slice(0, SENT_MAX).map(fileOnlyOf);

      const result = answerModuleSites(hubScanOf(), WEB_CTX, HUB_QUERY);

      expect(result).toMatchObject({ importedBy: expected, importedByTotal: HUB_COUNT });
    });
  });

  describe('GIVEN a line with leading spaces and a bidi override', () => {
    it('WHEN the file is asked THEN the text is trimmed and the override shown as U+FFFD', () => {
      const spaced = sourceImportOf('./y', 0, { text: '    import y from "./y"; // \u202E' });
      const scan = importScanOf([scannedFileOf('src/x.ts', [spaced])], { walkedFiles: X_WALKED });

      const imports = [textOnlyOf('import y from "./y"; // \uFFFD')];

      const result = answerModuleSites(scan, WEB_CTX, X_QUERY);

      expect(result).toMatchObject({ imports });
    });
  });

  describe('GIVEN importers with a too-long path and a line past the cap', () => {
    it('WHEN the target is asked THEN only the short in-cap site is sent and all three counted', () => {
      const long = scannedFileOf(LONG, [sourceImportOf('./src/y', 0)]);
      const x = scannedFileOf('src/x.ts', [sourceImportOf('./y', MANIFEST_LINE_MAX + 1)]);
      const z = scannedFileOf('src/z.ts', [sourceImportOf('./y', 2)]);
      const scan = importScanOf([long, x, z], { walkedFiles: [LONG, ...X_WALKED] });

      const importedBy = [placeOf('src/z.ts', 2)];

      const result = answerModuleSites(scan, WEB_CTX, Y_QUERY);

      expect(result).toMatchObject({ importedBy, importedByTotal: 3 });
    });
  });

  describe('GIVEN imports whose target path and stub name are over their caps', () => {
    it('WHEN the file is asked THEN no site is sent and both are counted', () => {
      const x = scannedFileOf('src/x.ts', [sourceImportOf(`./${T}`, 0), sourceImportOf(LONG_NAME, 1)]);
      const scan = importScanOf([x], { walkedFiles: ['src/x.ts', `src/${T}.ts`] });

      const result = answerModuleSites(scan, LONG_NAME_CTX, X_QUERY);

      expect(result).toMatchObject({ imports: [], importsTotal: 2 });
    });
  });

  describe('GIVEN a scan cut by its time limit', () => {
    it('WHEN the file is asked THEN the limit is sent', () => {
      const scan = importScanOf([X_FILE, Z_FILE], { walkedFiles: X_WALKED, limit: 'time' });

      const result = answerModuleSites(scan, WEB_CTX, X_QUERY);

      expect(result).toMatchObject({ limit: 'time' });
    });
  });

  describe('GIVEN a frozen scan', () => {
    it('WHEN the file is asked THEN it does not throw and sends the same sites', () => {
      const result = answerModuleSites(frozenScanOf(X_SCAN), WEB_CTX, X_QUERY);

      expect(result).toStrictEqual(FOUND_X);
    });
  });
});
