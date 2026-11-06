import { IMPORT_SCAN_CAPS } from '../common/import-scan.const.ts';
import type { CachedFile, ImportScanInput, PackageImportScan } from '../common/import-scan.type.ts';
import type { FileOutcome, ImportScanRun, ImportWalk } from '../common/import-walk.type.ts';
import { scanFile } from '../data-access/import-file-scan.ts';
import { walkSourceFiles } from '../data-access/import-walk.ts';
import { packageScanOf } from '../utils/package-scan.util.ts';

const UNREACHED: FileOutcome = { kind: 'unreached' };

/** What the read workers leave: one outcome per walked file, and whether the clock stopped them. */
type ReadPhase = {
  readonly outcomes: FileOutcome[];
  // eslint-disable-next-line local/readonly-type-properties -- a worker sets it when the clock runs out
  isTimeStopped: boolean;
};

/**
 * Reads the walked files with `caps.reads` workers over one cursor. Every cache-hit `lstat` runs inside a worker too, so
 * a warm scan stats `caps.reads` files at once instead of one by one. A worker stops on abort or when the time is up.
 */
const readFiles = async (run: ImportScanRun, walk: ImportWalk, previous: ReadonlyMap<string, CachedFile>): Promise<ReadPhase> => {
  const outcomes: FileOutcome[] = walk.files.map(() => UNREACHED);
  const phase: ReadPhase = { outcomes, isTimeStopped: false };
  const cursor = walk.files.entries();

  const worker = async (): Promise<void> => {
    for (const [index, walked] of cursor) {
      if (run.signal.aborted) return;

      const isOverTime = run.isOverTime();

      if (isOverTime) {
        phase.isTimeStopped = true;

        return;
      }

      outcomes[index] = await scanFile(walked, previous.get(walked.file), run.caps.fileBytes);
    }
  };

  const workers = Array.from({ length: run.caps.reads }, worker);

  await Promise.all(workers);

  return phase;
};

/**
 * Every import in the source files of `input.dir` (T3 walk, D8 caps), re-lexing only files whose `mtimeMs` or `size`
 * changed since the last finished scan of that dir (D9). The cache is replaced when the scan finishes, also when a cap
 * stopped it; a walked file the clock stopped before keeps its entry. Rejects with `signal.reason` when aborted, and
 * with the raw error when `dir` itself cannot be read; either leaves the cache as it was.
 */
export const scanPackageImports = async (input: ImportScanInput): Promise<PackageImportScan> => {
  input.signal.throwIfAborted();

  const caps = input.caps ?? IMPORT_SCAN_CAPS;
  const now = input.now ?? Date.now;
  const start = now();
  const isOverTime = (): boolean => now() - start >= caps.timeMs;
  const run: ImportScanRun = { dir: input.dir, skipDirs: input.skipDirs, caps, signal: input.signal, isOverTime };
  const walk = await walkSourceFiles(run);
  const previous = input.cache.filesOf(input.dir);
  const phase = await readFiles(run, walk, previous);

  input.signal.throwIfAborted();

  const timeLimit = phase.isTimeStopped ? 'time' : null;
  const result = packageScanOf(walk, phase.outcomes, walk.limit ?? timeLimit, previous);

  input.cache.swap(input.dir, result.cached);

  return result.scan;
};
