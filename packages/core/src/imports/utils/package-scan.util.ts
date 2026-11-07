import type { CachedFile, ImportScanLimit, PackageImportScan, ScannedFile } from '../common/import-scan.type.ts';
import type { FileOutcome, ImportWalk, PackageScanResult } from '../common/import-walk.type.ts';

/**
 * Folds the outcome of each walked file (`outcomes[i]` belongs to `walk.files[i]`) into the cache map the scan leaves
 * and the scan result. A scanned file is cached and counted, and listed only when it has imports (OQ9); a skipped one
 * is counted; an unreached one is neither, but keeps its `previous` entry so the next scan need not re-read it.
 * `tsconfigPaths` is `null` here; `scanPackageImports` sets it.
 */
export const packageScanOf = (
  walk: ImportWalk,
  outcomes: FileOutcome[],
  limit: ImportScanLimit | null,
  previous: ReadonlyMap<string, CachedFile>
): PackageScanResult => {
  const cached = new Map<string, CachedFile>();
  const files: ScannedFile[] = [];
  let scanned = 0;
  let skipped = 0;

  for (const [index, walked] of walk.files.entries()) {
    const outcome = outcomes[index];
    const known = previous.get(walked.file);
    const isCarried = outcome?.kind === 'unreached' && known !== undefined;

    if (outcome?.kind === 'skipped') skipped += 1;

    if (isCarried) cached.set(walked.file, known);

    if (outcome?.kind !== 'scanned') continue;

    const imports = outcome.cached.imports;

    cached.set(walked.file, outcome.cached);
    scanned += 1;

    if (imports.length > 0) files.push({ file: walked.file, imports });
  }

  const scan: PackageImportScan = { files, tsconfigPaths: null, scanned, skipped, limit };
  const result: PackageScanResult = { scan, cached };

  return result;
};
