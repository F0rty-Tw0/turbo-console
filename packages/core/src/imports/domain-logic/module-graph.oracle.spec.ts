import { join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

import { scanPackageImports } from './scan-package-imports.ts';
import { PATHS_SKIPPED } from '../common/import-scan.const.ts';
import type { PackageImportScan, ScannedFile } from '../common/import-scan.type.ts';
import type { ModuleGraph, ModuleLink } from '../common/module-graph.type.ts';
import { ImportFileCache } from '../data-access/import-file-cache.ts';
import { capsOf } from '../test/utils/scan-caps.spec.util.ts';
import { inputOf } from '../test/utils/scan-input.spec.util.ts';
import { moduleGraphOf } from '../utils/module-graph.util.ts';

type KnownGap = {
  readonly pair: string;
  readonly reason: string;
};

const DIR = resolve(import.meta.dirname, '../../../../webview-ui');
const SCAN_TIMEOUT_MS = 60_000;

/** Bundler resolution models the resolver's probe order: extension swaps, then extensions, then `index` files. */
const OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  noEmit: true
};

/**
 * Each row is one pair that only one side has, with a spec §11 reason; empty at plan time. `pair` carries the
 * mismatch sign: `+ <from> -> <to>` only ours, `- <from> -> <to>` only TypeScript.
 */
const KNOWN_GAPS: KnownGap[] = [];

const isRelative = (specifier: string): boolean => {
  const isDotted = PATHS_SKIPPED.test(specifier);
  const isRooted = specifier.startsWith('/');

  return isDotted || isRooted;
};

/** The posix path, relative to `DIR`, of the file TypeScript resolves `specifier` to from `from`; null when none. */
const tsResolvedOf = (specifier: string, from: string): string | null => {
  const resolved = ts.resolveModuleName(specifier, join(DIR, from), OPTIONS, ts.sys).resolvedModule;

  if (resolved === undefined) return null;

  const isDeclaration = resolved.resolvedFileName.endsWith('.d.ts');
  const segments = relative(DIR, resolved.resolvedFileName).split(sep);
  const target = segments.join('/');

  return isDeclaration ? null : target;
};

const isFound = (target: string | null): target is string => target !== null;

/** `<from> -> <to>` for each relative import of `scanned` that TypeScript resolves to another walked file inside `DIR`. */
const filePairsOf = (scanned: ScannedFile, walked: ReadonlySet<string>): string[] => {
  const from = scanned.file;
  const relatives = scanned.imports.filter((source) => isRelative(source.specifier));
  const resolved = relatives.map((source) => tsResolvedOf(source.specifier, from));
  const targets = resolved.filter(isFound);

  const isPair = (target: string): boolean => {
    const isInside = !target.startsWith('../');
    const isWalked = walked.has(target);

    return isInside && isWalked && target !== from;
  };

  const pairTargets = targets.filter(isPair);
  const pairs = pairTargets.map((target) => `${from} -> ${target}`);

  return pairs;
};

const tsPairsOf = (scan: PackageImportScan): Set<string> => {
  const walked = new Set(scan.walkedFiles);
  const pairs = scan.files.flatMap((scanned) => filePairsOf(scanned, walked));
  const pairSet = new Set(pairs);

  return pairSet;
};

const ourPairsOf = (graph: ModuleGraph): Set<string> => {
  const pairOf = ([from, to]: ModuleLink): string => `${graph.files[from] ?? ''} -> ${graph.files[to] ?? ''}`;
  const pairs = new Set(graph.fileLinks.map(pairOf));

  return pairs;
};

const mismatchesOf = (ours: ReadonlySet<string>, theirs: ReadonlySet<string>): string[] => {
  const ourList = [...ours];
  const theirList = [...theirs];
  const onlyOurs = ourList.filter((pair) => !theirs.has(pair)).map((pair) => `+ ${pair}`);
  const onlyTheirs = theirList.filter((pair) => !ours.has(pair)).map((pair) => `- ${pair}`);
  const mismatches = [...onlyOurs, ...onlyTheirs];

  return mismatches.toSorted();
};

describe('FEATURE: module links agree with the TypeScript resolver', () => {
  describe('GIVEN a scan of the webview-ui package, which sets no tsconfig paths', () => {
    let scan: PackageImportScan;

    beforeAll(async () => {
      const caps = capsOf({ timeMs: SCAN_TIMEOUT_MS });

      scan = await scanPackageImports(inputOf(DIR, new ImportFileCache(), { caps }));
    }, SCAN_TIMEOUT_MS);

    it('WHEN the scan ran THEN no cap stopped it', () => {
      expect(scan.limit).toBeNull();
    });

    it(
      'WHEN TypeScript and moduleGraphOf resolve every relative specifier THEN their file links differ only by KNOWN_GAPS',
      () => {
        const graph = moduleGraphOf({ dir: DIR, selfName: '@turbo-console/webview-ui', scan, others: [] });
        const ours = ourPairsOf(graph);
        const theirs = tsPairsOf(scan);

        expect(ours.size).toBeGreaterThan(0);
        expect(mismatchesOf(ours, theirs)).toStrictEqual(KNOWN_GAPS.map((gap) => gap.pair));
      },
      SCAN_TIMEOUT_MS
    );
  });
});
