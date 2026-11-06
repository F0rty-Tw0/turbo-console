import { join, resolve } from 'node:path';

import type { PackageImportScan, ScannedFile, SourceImport } from '@turbo-console/core';
import type { EdgeImportsResult, ImportSite } from '@turbo-console/webview-ui';

import type { ImportEdge } from '../../common/import-match.type.ts';

const ROOT = resolve('/ws');

/** B's package name in the edge below. */
export const TARGET_NAME = '@company/ui';

/** The edge A → B the answer specs ask about: A and B are sibling packages. */
export const IMPORT_EDGE: ImportEdge = {
  names: [TARGET_NAME],
  targetDir: join(ROOT, 'packages', 'b'),
  sourceDir: join(ROOT, 'packages', 'a')
};

/** A static, value import of `specifier` on `line`; `patch` overrides any field. */
export const sourceImportOf = (specifier: string, line: number, patch: Partial<SourceImport> = {}): SourceImport => {
  const text = `import x from '${specifier}';`;
  const source: SourceImport = { specifier, kind: 'static', isType: false, line, text, ...patch };

  return source;
};

export const scannedFileOf = (file: string, imports: SourceImport[]): ScannedFile => {
  const scanned: ScannedFile = { file, imports };

  return scanned;
};

/** A scan that finished: every file counted as scanned, nothing skipped, no limit. */
export const importScanOf = (files: ScannedFile[], patch: Partial<PackageImportScan> = {}): PackageImportScan => {
  const scan: PackageImportScan = { files, tsconfigPaths: null, scanned: files.length, skipped: 0, limit: null, ...patch };

  return scan;
};

/** A deep copy of `scan` with every array and object frozen, so an in-place write on the import cache's arrays throws. */
export const frozenScanOf = (scan: PackageImportScan): PackageImportScan => {
  const copy: PackageImportScan = structuredClone(scan);

  for (const scanned of copy.files) {
    scanned.imports.forEach((source) => Object.freeze(source));
    Object.freeze(scanned.imports);
    Object.freeze(scanned);
  }

  Object.freeze(copy.files);

  return Object.freeze(copy);
};

/** A scanned file with one import of B on each of `lines`. */
export const matchedFileOf = (file: string, ...lines: number[]): ScannedFile => {
  const imports = lines.map((line) => sourceImportOf(TARGET_NAME, line));

  return scannedFileOf(file, imports);
};

/** The sites of a `found` result; none for any other kind. */
export const foundSitesOf = (result: EdgeImportsResult): ImportSite[] => {
  if (result.kind !== 'found') return [];

  return result.sites;
};

/** The sites of `result` as `file:line` text. */
export const placesOf = (result: EdgeImportsResult): string[] => foundSitesOf(result).map((site) => `${site.file}:${site.line}`);
