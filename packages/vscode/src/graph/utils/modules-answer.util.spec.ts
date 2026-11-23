import { join } from 'node:path';

import type { ScannedFile, SourceImport } from '@turbo-console/core';
import { MANIFEST_FILE_MAX, MODULE_FILES_MAX, MODULE_LINKS_MAX } from '@turbo-console/webview-ui';
import type { ModuleCounts, ModulesFound } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { answerModules } from './modules-answer.util.ts';
import type { ModulesContext } from '../common/import-match.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { GRAPH_INFOS_STUB } from '../test/stubs/graph-model.stub.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';
import { frozenScanOf, importScanOf, scannedFileOf, sourceImportOf } from '../test/utils/import-scan.spec.util.ts';

const WEB_DIR = join(IMPORT_ROOT, 'apps', 'web');
const WEB_CTX: ModulesContext = {
  root: IMPORT_ROOT,
  packageName: 'web',
  dir: WEB_DIR,
  packages: GRAPH_INFOS_STUB,
  manifestText: null
};
const ROOT_PACKAGE = graphPackageOf('//', '');
const ROOTED_PACKAGES = [...GRAPH_INFOS_STUB, ROOT_PACKAGE];
const LONG = `${'x'.repeat(MANIFEST_FILE_MAX + 1)}.ts`;
const LONG2 = `${'y'.repeat(MANIFEST_FILE_MAX + 1)}.ts`;
const LONG_NAME = 'n'.repeat(215);
const RING_SIZE = 11;
const NO_COUNTS: ModuleCounts = { unresolved: 0, external: 0, assets: 0, self: 0 };
const SELF_ONE = { self: 1 };
const UNRESOLVED_ONE = { unresolved: 1 };
const X_IMPORTS_A = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('a', 0)])]);
const FOUND_X_TO_A: ModulesFound = {
  kind: 'found',
  files: ['src/x.ts'],
  tests: [],
  stubs: ['a'],
  fileLinks: [],
  stubLinks: [[0, 0, 1, 0, 0]],
  counts: NO_COUNTS,
  scanned: 1,
  skipped: 0,
  limit: null,
  dropped: 0
};

/** `src/f<index>.ts`, importing `extra`. */
const shortFileOf = (index: number, extra: SourceImport[] = []): ScannedFile => scannedFileOf(`src/f${index}.ts`, extra);

/** The imports of the next `RING_SIZE` files of a ring of `MODULE_FILES_MAX`, from `src/f<index>.ts`. */
const ringImportsOf = (index: number): SourceImport[] => {
  const specifierOf = (step: number): string => `./f${(index + step + 1) % MODULE_FILES_MAX}`;

  return Array.from({ length: RING_SIZE }, (_value, step) => sourceImportOf(specifierOf(step), step));
};

const ringFileOf = (index: number): ScannedFile => shortFileOf(index, ringImportsOf(index));

const shortFilesOf = (count: number): ScannedFile[] => Array.from({ length: count }, (_value, index) => shortFileOf(index));

describe('FEATURE: modules answer of one package scan', () => {
  describe('GIVEN a static import of a workspace package', () => {
    it("WHEN src/x.ts imports 'a' THEN the one file links to the stub a", () => {
      const result = answerModules(frozenScanOf(X_IMPORTS_A), WEB_CTX);

      expect(result).toStrictEqual(FOUND_X_TO_A);
    });
  });

  describe('GIVEN a file whose path is too long', () => {
    it('WHEN it imports src/b.ts, which imports src/c.spec.ts THEN it and its link are dropped and the rest re-indexed', () => {
      const long = scannedFileOf(LONG, [sourceImportOf('./src/b', 0)]);
      const b = scannedFileOf('src/b.ts', [sourceImportOf('./c.spec', 0)]);
      const scan = importScanOf([long, b, scannedFileOf('src/c.spec.ts', [])]);

      const result = answerModules(scan, WEB_CTX);

      expect(result).toMatchObject({ files: ['src/b.ts', 'src/c.spec.ts'], tests: [1], fileLinks: [[0, 1, 1, 0, 0]], dropped: 2 });
    });
  });

  describe('GIVEN two too-long files that import each other', () => {
    it('WHEN answered THEN both files and both links are dropped, each link counted once', () => {
      const long = scannedFileOf(LONG, [sourceImportOf(`./${LONG2}`, 0)]);
      const long2 = scannedFileOf(LONG2, [sourceImportOf(`./${LONG}`, 0)]);

      const result = answerModules(importScanOf([long, long2]), WEB_CTX);

      expect(result).toMatchObject({ files: [], fileLinks: [], dropped: 4 });
    });
  });

  describe('GIVEN a too-long file before MODULE_FILES_MAX short files', () => {
    it('WHEN answered THEN the long file is dropped before the cut, so every short file is kept', () => {
      const shortFiles = shortFilesOf(MODULE_FILES_MAX);
      const scan = importScanOf([scannedFileOf(LONG, []), ...shortFiles]);

      const result = answerModules(scan, WEB_CTX);

      expect(result).toHaveProperty('files.length', MODULE_FILES_MAX);
      expect(result).toMatchObject({ dropped: 1 });
    });
  });

  describe('GIVEN more than MODULE_FILES_MAX files', () => {
    it("WHEN src/f0.ts imports './f5000' THEN the last file and the link to it are dropped", () => {
      const last = shortFileOf(MODULE_FILES_MAX);
      const first = shortFileOf(0, [sourceImportOf(`./f${MODULE_FILES_MAX}`, 0)]);
      const files = shortFilesOf(MODULE_FILES_MAX).with(0, first);

      const result = answerModules(importScanOf([...files, last]), WEB_CTX);

      expect(result).toHaveProperty('files.length', MODULE_FILES_MAX);
      expect(result).toMatchObject({ fileLinks: [], dropped: 2 });
    });
  });

  describe('GIVEN a stub name over MODULE_STUB_NAME_MAX', () => {
    it('WHEN src/x.ts imports that package THEN the stub and its link are dropped', () => {
      const packages = [...GRAPH_INFOS_STUB, graphPackageOf(LONG_NAME, 'packages/long')];
      const scan = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf(LONG_NAME, 0)])]);

      const result = answerModules(scan, { ...WEB_CTX, packages });

      expect(result).toMatchObject({ stubs: [], stubLinks: [], dropped: 2 });
    });
  });

  describe('GIVEN more than MODULE_LINKS_MAX links', () => {
    it('WHEN every file imports the next 11 and src/f0.ts also imports a THEN the leading file links fill the cap', () => {
      const stubImport = sourceImportOf('a', RING_SIZE);
      const ring = Array.from({ length: MODULE_FILES_MAX }, (_value, index) => ringFileOf(index));
      const firstImports = ringImportsOf(0);
      const first = shortFileOf(0, [...firstImports, stubImport]);

      const result = answerModules(importScanOf(ring.with(0, first)), WEB_CTX);

      expect(result).toHaveProperty('fileLinks.length', MODULE_LINKS_MAX);
      expect(result).toMatchObject({ stubLinks: [], stubs: ['a'], dropped: 5001 });
    });
  });

  describe('GIVEN the root package // is scanned', () => {
    it("WHEN scripts/x.ts imports 'monorepo/y' and '../packages/a/src/y' THEN one counts as self and one links to a", () => {
      const ctx: ModulesContext = {
        ...WEB_CTX,
        packageName: '//',
        dir: IMPORT_ROOT,
        packages: ROOTED_PACKAGES,
        manifestText: '{"name":"monorepo"}'
      };
      const imports = [sourceImportOf('monorepo/y', 0), sourceImportOf('../packages/a/src/y', 1)];

      const result = answerModules(importScanOf([scannedFileOf('scripts/x.ts', imports)]), ctx);

      expect(result).toMatchObject({ counts: SELF_ONE, stubs: ['a'], stubLinks: [[0, 0, 1, 0, 0]] });
    });
  });

  describe('GIVEN an import from web into a folder no package owns', () => {
    it("WHEN the root // is listed at path '' THEN the import is unresolved: the root owns nothing", () => {
      const scan = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('../../tools/x', 0)])]);

      const result = answerModules(scan, { ...WEB_CTX, packages: ROOTED_PACKAGES });

      expect(result).toMatchObject({ counts: UNRESOLVED_ONE, stubs: [] });
    });
  });

  describe('GIVEN a manifest that aliases a package', () => {
    it("WHEN ui-alias maps to workspace:a@* and src/x.ts imports 'ui-alias' THEN it links to the stub a", () => {
      const manifestText = '{"dependencies":{"ui-alias":"workspace:a@*"}}';
      const scan = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('ui-alias', 0)])]);

      const result = answerModules(scan, { ...WEB_CTX, manifestText });

      expect(result).toMatchObject({ stubs: ['a'] });
    });
  });

  describe("GIVEN src/x.ts of web imports 'web/y'", () => {
    it.each([
      ['has no string name', '{"name":7}', { self: 1, external: 0 }],
      ['names the package web-app', '{"name":"web-app"}', { self: 0, external: 1 }]
    ])('WHEN the manifest %s THEN the counts are %o', (_label, manifestText, counts) => {
      const scan = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('web/y', 0)])]);

      const result = answerModules(scan, { ...WEB_CTX, manifestText });

      expect(result).toMatchObject({ counts });
    });
  });
});
