import { join, posix } from 'node:path';

import { resolveSpecifierOf } from './module-resolve.util.ts';
import { isTestFile } from './test-file.util.ts';
import type { ScannedFile, SourceImport } from '../common/import-scan.type.ts';
import type {
  ModuleBucket,
  ModuleGraph,
  ModuleGraphInput,
  ModuleLink,
  ModuleResolveContext,
  ModuleTarget
} from '../common/module-graph.type.ts';

type LinkRow = [from: number, to: number, statics: number, types: number, lazies: number];

/** Link rows keyed by `<from> <to>`. */
type LinkRows = Map<string, LinkRow>;

/** One call's fold state: targets memoized per (importing dir, specifier), and stub rows per stub name with `to` unset. */
type ModuleFold = {
  readonly context: ModuleResolveContext;
  readonly indexes: ReadonlyMap<string, number>;
  readonly memo: Map<string, Map<string, ModuleTarget>>;
  readonly fileRows: LinkRows;
  readonly stubRows: Map<string, LinkRows>;
  readonly counts: Record<ModuleBucket, number>;
};

/** The link column an import counts in: 2 statics, 3 types, 4 lazies. */
const columnOf = (source: SourceImport): 2 | 3 | 4 => {
  if (source.isType) return 3;

  const isLazy = source.kind === 'dynamic' || source.kind === 'require';

  return isLazy ? 4 : 2;
};

const addLink = (rows: LinkRows, from: number, to: number, column: 2 | 3 | 4): void => {
  const key = `${from} ${to}`;
  const row: LinkRow = rows.get(key) ?? [from, to, 0, 0, 0];

  row[column] += 1;
  rows.set(key, row);
};

const targetOf = (fold: ModuleFold, fromDir: string, specifier: string): ModuleTarget => {
  const targets = fold.memo.get(fromDir) ?? new Map<string, ModuleTarget>();
  const target = targets.get(specifier) ?? resolveSpecifierOf(specifier, fromDir, fold.context);

  targets.set(specifier, target);
  fold.memo.set(fromDir, targets);

  return target;
};

const stubRowsOf = (fold: ModuleFold, name: string): LinkRows => {
  const rows: LinkRows = fold.stubRows.get(name) ?? new Map<string, LinkRow>();

  fold.stubRows.set(name, rows);

  return rows;
};

const foldFile = (fold: ModuleFold, scanned: ScannedFile): void => {
  const from = fold.indexes.get(scanned.file);
  const fromDir = join(fold.context.dir, posix.dirname(scanned.file));

  if (from === undefined) return;

  for (const source of scanned.imports) {
    const target = targetOf(fold, fromDir, source.specifier);
    const column = columnOf(source);

    if (target.kind === 'stub') {
      addLink(stubRowsOf(fold, target.name), from, 0, column);
    } else if (target.kind === 'file') {
      const to = fold.indexes.get(target.file);
      const isLink = to !== undefined && to !== from;

      if (isLink) addLink(fold.fileRows, from, to, column);
    } else {
      fold.counts[target.kind] += 1;
    }
  }
};

const testsOf = (files: string[]): number[] => {
  const tests: number[] = [];

  for (const [index, file] of files.entries()) {
    const isTest = isTestFile(file);

    if (isTest) tests.push(index);
  }

  return tests;
};

const byPair = (left: ModuleLink, right: ModuleLink): number => left[0] - right[0] || left[1] - right[1];

/** Every stub row with `to` set to its stub's index in `stubs`. */
const stubLinksOf = (fold: ModuleFold, stubs: string[]): ModuleLink[] => {
  const links: ModuleLink[] = [];

  for (const [to, name] of stubs.entries()) {
    const rows = fold.stubRows.get(name)?.values() ?? [];

    for (const [from, , statics, types, lazies] of rows) links.push([from, to, statics, types, lazies]);
  }

  return links.toSorted(byPair);
};

/**
 * Folds one package's import scan into module links: walked files are nodes, imports of other workspace packages land
 * on stubs, and every other import adds to its bucket's count. Each (importing dir, specifier) resolves once. Pure.
 */
export const moduleGraphOf = (input: ModuleGraphInput): ModuleGraph => {
  const { dir, selfName, scan, others } = input;
  const files = [...scan.walkedFiles];
  const walked = new Set(files);
  const context: ModuleResolveContext = { dir, selfName, walked, tsconfigPaths: scan.tsconfigPaths, others };
  const indexes = new Map(files.map((file, index) => [file, index]));
  const counts: Record<ModuleBucket, number> = { unresolved: 0, external: 0, assets: 0, self: 0 };
  const fold: ModuleFold = { context, indexes, memo: new Map(), fileRows: new Map(), stubRows: new Map(), counts };

  for (const scanned of scan.files) foldFile(fold, scanned);

  const tests = testsOf(files);
  const stubNames = Array.from(fold.stubRows.keys());
  const fileRows: ModuleLink[] = Array.from(fold.fileRows.values());
  const stubs = stubNames.toSorted();
  const fileLinks = fileRows.toSorted(byPair);
  const stubLinks = stubLinksOf(fold, stubs);
  const graph: ModuleGraph = { files, tests, stubs, fileLinks, stubLinks, counts };

  return graph;
};
