import type { PackageImportScan, ScannedFile, SourceImport } from '../../common/import-scan.type.ts';
import { SOURCE_IMPORT_STUB } from '../stubs/import-scan.stub.ts';

/** A finished scan that walked `walked`; each walked file with an `imports` entry is listed, in walk order. */
export const moduleScanOf = (walked: string[], imports: Readonly<Record<string, SourceImport[]>>): PackageImportScan => {
  const files: ScannedFile[] = [];

  for (const file of walked) {
    const fileImports = imports[file];

    if (fileImports !== undefined) files.push({ file, imports: fileImports });
  }

  const scan: PackageImportScan = { files, walkedFiles: walked, tsconfigPaths: null, scanned: walked.length, skipped: 0, limit: null };

  return scan;
};

/** A static value import of `specifier`, with `patch` over it. */
export const importOf = (specifier: string, patch: Partial<SourceImport> = {}): SourceImport => {
  const source: SourceImport = { ...SOURCE_IMPORT_STUB, specifier, ...patch };

  return source;
};
