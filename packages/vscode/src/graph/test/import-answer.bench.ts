import { join, resolve } from 'node:path';

import type { PackageImportScan, ScannedFile, SourceImport, TsconfigPaths } from '@turbo-console/core';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';
import { IMPORT_SITES_MAX, MANIFEST_FILE_MAX } from '@turbo-console/webview-ui';
import type { EdgeImportsResult } from '@turbo-console/webview-ui';

import type { ImportEdge } from '../common/import-match.type.ts';
import { answerImports } from '../utils/import-answer.util.ts';
import { TARGET_NAME } from './common/import-edge.const.ts';
import { importScanOf, linesUpTo, scannedFileOf, sourceImportOf } from './utils/import-scan.spec.util.ts';

type SpecifierMix = {
  readonly byName: number;
  readonly intoTarget: number;
  readonly aliasIntoTarget: number;
  readonly inSource: number;
  readonly aliasInSource: number;
};

const DIRS = 25;
const FILES_PER_DIR = 10;
const LONG_FILES = 5;
const TEXT_WIDTH = 120;
const INDENT = ' '.repeat(8);
const FILLER_ALIASES = 28;

const BENCH_ROOT = resolve('/home/developer/projects/company-monorepo/workspace-checkout');

const BENCH_EDGE: ImportEdge = {
  names: [TARGET_NAME],
  targetDir: join(BENCH_ROOT, 'packages', 'b'),
  sourceDir: join(BENCH_ROOT, 'packages', 'a')
};

const PLAIN_MIX: SpecifierMix = { byName: 6, intoTarget: 4, aliasIntoTarget: 0, inSource: 10, aliasInSource: 0 };

/** `@company/ui-src` is not B's name, so only rule 4 matches it; `~/*` maps into A, so those specifiers give `null`. */
const ALIAS_MIX: SpecifierMix = { byName: 4, intoTarget: 4, aliasIntoTarget: 3, inSource: 6, aliasInSource: 3 };

/** 250 files x (6 by name + 4 relative into B) + 5 long-path files x 2 by name = 2,500 + 10. */
const PLAIN_TOTAL = 2_510;

/** 250 files x (4 by name + 4 relative + 3 alias into B) + 5 long-path files x 2 by name = 2,750 + 10. */
const ALIAS_TOTAL = 2_760;

const fillerEntryOf = (index: number): [string, string[]] => [`@lib${index}/*`, [`libs/lib${index}/src/*`]];

const FILLER_PATHS = Object.fromEntries(linesUpTo(FILLER_ALIASES).map(fillerEntryOf));

const USED_PATHS = { '@company/ui-src/*': ['packages/b/src/*'], '~/*': ['packages/a/src/*'] };

const ALL_PATHS = { ...USED_PATHS, ...FILLER_PATHS };

const ALIAS_PATHS: TsconfigPaths = { baseUrl: BENCH_ROOT, paths: ALL_PATHS };

const nameSpecifierOf = (index: number): string => {
  if (index === 0) return TARGET_NAME;

  return `${TARGET_NAME}/x${index}`;
};

const intoTargetOf = (index: number): string => `../../../b/src/x${index}`;

const aliasIntoTargetOf = (index: number): string => `@company/ui-src/x${index}`;

const inSourceOf = (index: number): string => `./y${index}`;

const aliasInSourceOf = (index: number): string => `~/x${index}`;

const specifiersOf = (mix: SpecifierMix): string[] => {
  const byName = linesUpTo(mix.byName).map(nameSpecifierOf);
  const intoTarget = linesUpTo(mix.intoTarget).map(intoTargetOf);
  const aliasIntoTarget = linesUpTo(mix.aliasIntoTarget).map(aliasIntoTargetOf);
  const inSource = linesUpTo(mix.inSource).map(inSourceOf);
  const aliasInSource = linesUpTo(mix.aliasInSource).map(aliasInSourceOf);

  return [...byName, ...intoTarget, ...aliasIntoTarget, ...inSource, ...aliasInSource];
};

const importOf = (specifier: string, index: number): SourceImport => {
  const line = `${INDENT}import { value } from '${specifier}';`;
  const text = line.padEnd(TEXT_WIDTH);

  return sourceImportOf(specifier, index + 1, { text });
};

const shortFileOf = (specifiers: string[], dir: number, index: number): ScannedFile => {
  const imports = specifiers.map(importOf);

  return scannedFileOf(`src/m${dir}/f${index}.ts`, imports);
};

const longFileOf = (index: number): ScannedFile => {
  const stem = `src/long${index}`;
  const file = `${stem.padEnd(MANIFEST_FILE_MAX + 1 - '.ts'.length, 'x')}.ts`;
  const specifiers = [TARGET_NAME, nameSpecifierOf(1)];
  const imports = specifiers.map(importOf);

  return scannedFileOf(file, imports);
};

const dirFilesOf = (specifiers: string[], dir: number): ScannedFile[] => {
  const fileOf = (index: number): ScannedFile => shortFileOf(specifiers, dir, index);

  return linesUpTo(FILES_PER_DIR).map(fileOf);
};

const scanOf = (mix: SpecifierMix, patch: Partial<PackageImportScan>): PackageImportScan => {
  const specifiers = specifiersOf(mix);
  const shortFiles = linesUpTo(DIRS).flatMap((dir) => dirFilesOf(specifiers, dir));
  const longFiles = linesUpTo(LONG_FILES).map(longFileOf);

  return importScanOf([...shortFiles, ...longFiles], patch);
};

const isExpectedAnswer = (result: EdgeImportsResult, total: number): boolean => {
  if (result.kind !== 'found') return false;

  const isTotal = result.total === total;
  const isCut = result.sites.length === IMPORT_SITES_MAX;
  const isDropped = result.skipped === LONG_FILES;

  return isTotal && isCut && isDropped;
};

const SCAN = scanOf(PLAIN_MIX, {});

const ALIAS_SCAN = scanOf(ALIAS_MIX, { tsconfigPaths: ALIAS_PATHS });

const CHECKED = answerImports(SCAN, BENCH_EDGE);

const ALIAS_CHECKED = answerImports(ALIAS_SCAN, BENCH_EDGE);

const IS_EXPECTED = isExpectedAnswer(CHECKED, PLAIN_TOTAL);

const IS_ALIAS_EXPECTED = isExpectedAnswer(ALIAS_CHECKED, ALIAS_TOTAL);

if (!IS_EXPECTED) throw new Error('answer-imports-5000 fixture drifted from its expected answer');

if (!IS_ALIAS_EXPECTED) throw new Error('answer-imports-5000-alias fixture drifted from its expected answer');

const benches: BenchDescriptor[] = [
  bench('answer-imports-5000', () => answerImports(SCAN, BENCH_EDGE), { gate: true }),
  bench('answer-imports-5000-alias', () => answerImports(ALIAS_SCAN, BENCH_EDGE), { gate: true })
];

export default benches;
