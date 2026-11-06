import type { PackageImportScan, ScannedFile, SourceImport } from '@turbo-console/core';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';
import { IMPORT_SITES_MAX, MANIFEST_FILE_MAX } from '@turbo-console/webview-ui';
import type { EdgeImportsResult } from '@turbo-console/webview-ui';

import { answerImports } from '../utils/import-answer.util.ts';
import { TARGET_NAME } from './common/import-edge.const.ts';
import { IMPORT_EDGE_STUB } from './stubs/import-edge.stub.ts';
import { importScanOf, linesUpTo, scannedFileOf, sourceImportOf } from './utils/import-scan.spec.util.ts';

const DIRS = 25;
const FILES_PER_DIR = 10;
const LONG_FILES = 5;
const TEXT_WIDTH = 120;
const INDENT = ' '.repeat(8);

/** 250 files x 12 matches + 5 long-path files x 2 matches. */
const EXPECTED_TOTAL = 3_010;

const nameSpecifierOf = (index: number): string => {
  if (index === 0) return TARGET_NAME;

  return `${TARGET_NAME}/x${index}`;
};

/** 20 specifiers: 8 by name, 4 relative into B, 4 relative staying in A, 4 other packages. */
const specifiersOf = (): string[] => {
  const byName = linesUpTo(8).map(nameSpecifierOf);
  const intoTarget = linesUpTo(4).map((index) => `../../../b/src/x${index}`);
  const inSource = linesUpTo(4).map((index) => `./y${index}`);
  const others = linesUpTo(4).map((index) => `@company/other${index}`);

  return [...byName, ...intoTarget, ...inSource, ...others];
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

const scanOf = (): PackageImportScan => {
  const shortFiles = linesUpTo(DIRS).flatMap((dir) => linesUpTo(FILES_PER_DIR).map((index) => shortFileOf(dir, index)));
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

const CHECKED = answerImports(SCAN, IMPORT_EDGE_STUB);
const IS_EXPECTED = isExpectedAnswer(CHECKED);

if (!IS_EXPECTED) throw new Error('answer-imports-5000 fixture drifted from its expected answer');

const benches: BenchDescriptor[] = [bench('answer-imports-5000', () => answerImports(SCAN, IMPORT_EDGE_STUB), { gate: true })];

export default benches;
