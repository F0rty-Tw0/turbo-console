import type { ImportFileStore, ImportScanInput } from '../../common/import-scan.type.ts';

/** A never-aborted scan of `dir` over `cache`; `patch` overrides any other field. */
export const inputOf = (dir: string, cache: ImportFileStore, patch: Partial<ImportScanInput> = {}): ImportScanInput => {
  const controller = new AbortController();
  const base: ImportScanInput = { dir, root: dir, skipDirs: new Set(), cache, signal: controller.signal };
  const input: ImportScanInput = { ...base, ...patch };

  return input;
};
