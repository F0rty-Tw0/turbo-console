import { join, resolve } from 'node:path';

import type { PackageImportScan, ScannedFile, SourceImport } from '@turbo-console/core';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';
import { IMPORT_SITES_MAX, MANIFEST_FILE_MAX } from '@turbo-console/webview-ui';
import type { EdgeImportsResult } from '@turbo-console/webview-ui';

import type { ImportEdge } from '../common/import-match.type.ts';
import { answerImports } from '../utils/import-answer.util.ts';
import { TARGET_NAME } from './common/import-edge.const.ts';
import { importScanOf, linesUpTo, scannedFileOf, sourceImportOf } from './utils/import-scan.spec.util.ts';

const DIRS = 25;
const FILES_PER_DIR = 10;
const LONG_FILES = 5;
const TEXT_WIDTH = 120;
const INDENT = ' '.repeat(8);

const BENCH_ROOT = resolve('/home/developer/projects/company-monorepo/workspace-checkout');

const BENCH_EDGE: ImportEdge = {
  names: [TARGET_NAME],
  targetDir: join(BENCH_ROOT, 'packages', 'b'),
  sourceDir: join(BENCH_ROOT, 'packages', 'a')
};

/** 250 files x (6 by name + 4 relative into B) + 5 long-path files x 2 by name = 2,500 + 10. */
const EXPECTED_TOTAL = 2_510;

const nameSpecifierOf = (index: number): string => {
  if (index === 0) return TARGET_NAME;

  return `${TARGET_NAME}/x${index}`;
};

const intoTargetOf = (index: number): string => `../../../b/src/x${index}`;

const inSourceOf = (index: number): string => `./y${index}`;

/** 20 specifiers: 6 by name, 4 relative into B, 10 relative staying in A. */
const specifiersOf = (): string[] => {
  const byName = linesUpTo(6).map(nameSpecifierOf);
  const intoTarget = linesUpTo(4).map(intoTargetOf);
  const inSource = linesUpTo(10).map(inSourceOf);

  return [...byName, ...intoTarget, ...inSource];
};

const importOf = (specifier: string, index: number): SourceImport => {
  const line = `${INDENT}import { value } from '${specifier}';`;
  const text = line.padEnd(TEXT_WIDTH);

  return sourceImportOf(specifier, index + 1, { text });
};

const shortFileOf = (dir: number, index: number): ScannedFile => {
  const imports = specifiersOf().map(importOf);

  return scannedFileOf(`src/m${dir}/f${index}.ts`, imports);
};

const longFileOf = (index: number): ScannedFile => {
  const stem = `src/long${index}`;
  const file = `${stem.padEnd(MANIFEST_FILE_MAX + 1 - '.ts'.length, 'x')}.ts`;
  const specifiers = [TARGET_NAME, nameSpecifierOf(1)];
  const imports = specifiers.map(importOf);

  return scannedFileOf(file, imports);
};

const dirFilesOf = (dir: number): ScannedFile[] => linesUpTo(FILES_PER_DIR).map((index) => shortFileOf(dir, index));

const scanOf = (): PackageImportScan => {
  const shortFiles = linesUpTo(DIRS).flatMap(dirFilesOf);
  const longFiles = linesUpTo(LONG_FILES).map(longFileOf);

  return importScanOf([...shortFiles, ...longFiles]);
};

const isExpectedAnswer = (result: EdgeImportsResult): boolean => {
  if (result.kind !== 'found') return false;

  const isTotal = result.total === EXPECTED_TOTAL;
  const isCut = result.sites.length === IMPORT_SITES_MAX;
  const isDropped = result.skipped === LONG_FILES;

  return isTotal && isCut && isDropped;
};

const SCAN = scanOf();

const CHECKED = answerImports(SCAN, BENCH_EDGE);
const IS_EXPECTED = isExpectedAnswer(CHECKED);

if (!IS_EXPECTED) throw new Error('answer-imports-5000 fixture drifted from its expected answer');

const benches: BenchDescriptor[] = [bench('answer-imports-5000', () => answerImports(SCAN, BENCH_EDGE), { gate: true })];

export default benches;
