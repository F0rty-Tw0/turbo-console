import { rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import type { PackageImportScan } from '../common/import-scan.type.ts';
import { ImportFileCache } from '../data-access/import-file-cache.ts';
import { scanPackageImports } from '../domain-logic/scan-package-imports.ts';
import { generatedSourceOf } from './utils/generated-source.spec.util.ts';
import { writeImportTree } from './utils/import-tree.spec.util.ts';
import { inputOf } from './utils/scan-input.spec.util.ts';

const DIRS = 50;
const FILES_PER_DIR = 40;
const FILE_COUNT = DIRS * FILES_PER_DIR;
const FILE_CHARS = 4096;

const filesOfTree = (): Record<string, string> => {
  const text = generatedSourceOf(FILE_CHARS);
  const files: Record<string, string> = {};

  for (let dir = 0; dir < DIRS; dir++) {
    for (let file = 0; file < FILES_PER_DIR; file++) files[`src/m${dir}/f${file}.ts`] = text;
  }

  return files;
};

/**
 * `scanPackageImports` over a 2,000-file temp tree of about 9 MB. "Cold" scans over an empty lex cache, "warm" over a
 * cache one scan filled; the OS page cache is warm in both. On Linux dev boxes `tmpdir()` is usually tmpfs, which may
 * flatter warm by up to about 2x over a disk-backed tree. The tree is removed when the process exits: the runner
 * times every bench after loading every file, so no dispose can run earlier.
 */
const dir = await mkdtemp(join(tmpdir(), 'import-scan-bench-'));

process.once('exit', () => rmSync(dir, { recursive: true, force: true, maxRetries: 5 }));

await writeImportTree(dir, filesOfTree());

const warmCache = new ImportFileCache();
const primed = await scanPackageImports(inputOf(dir, warmCache));

const isComplete = primed.scanned === FILE_COUNT && primed.limit === null;

if (!isComplete) throw new Error(`import scan bench tree: scanned ${primed.scanned} of ${FILE_COUNT}, limit ${primed.limit}`);

const cold = async (): Promise<PackageImportScan> => scanPackageImports(inputOf(dir, new ImportFileCache()));
const warm = async (): Promise<PackageImportScan> => scanPackageImports(inputOf(dir, warmCache));

const benches: BenchDescriptor[] = [
  bench('import-scan-2000-cold', cold, { gate: false }),
  bench('import-scan-2000-warm', warm, { gate: false })
];

export default benches;
