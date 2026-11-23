import { join, posix } from 'node:path';

import { memoTargetOf } from './module-target.util.ts';
import type { ScannedFile } from '../common/import-scan.type.ts';
import type { ModuleGraphInput, ModuleResolveContext, ModuleTarget } from '../common/module-graph.type.ts';
import type { ModuleEnd, ModuleSiteRow, ModuleSites, ModuleSitesQuery } from '../common/module-sites.type.ts';

/** One call's walk state: targets memoized per (importing dir, specifier), and the unsorted rows of both lists. */
type SitesWalk = {
  readonly context: ModuleResolveContext;
  readonly memo: Map<string, Map<string, ModuleTarget>>;
  readonly query: ModuleSitesQuery;
  readonly imports: ModuleSiteRow[];
  readonly importedBy: ModuleSiteRow[];
};

/** Posix and exact-case: a file end holds its own path, a dir end every path below it, a stub end none. */
const isPathIn = (end: ModuleEnd, path: string): boolean => {
  if (end.kind === 'stub') return false;

  if (end.kind === 'file') return path === end.path;

  return path.startsWith(`${end.path}/`);
};

const isTargetIn = (end: ModuleEnd, target: ModuleSiteRow['target']): boolean => {
  if (target.kind === 'file') return isPathIn(end, target.path);

  return end.kind === 'stub' && end.name === target.name;
};

const isTargetInTo = (to: ModuleEnd | null, target: ModuleSiteRow['target']): boolean => to !== null && isTargetIn(to, target);

/** The row target of a walked file or stub; null for a bucket and for a self-import of `file`. */
const rowTargetOf = (target: ModuleTarget, file: string): ModuleSiteRow['target'] | null => {
  if (target.kind === 'stub') {
    const stub: ModuleSiteRow['target'] = { kind: 'stub', name: target.name };

    return stub;
  }

  if (target.kind !== 'file' || target.file === file) return null;

  const fileTarget: ModuleSiteRow['target'] = { kind: 'file', path: target.file };

  return fileTarget;
};

/** A link query keeps rows from `from` into `to`; an end query splits rows leaving `from` and rows entering it. */
const collectRow = (walk: SitesWalk, row: ModuleSiteRow, isFileIn: boolean): void => {
  const { from, to } = walk.query;
  const isLinkQuery = to !== null;
  const isInFrom = isTargetIn(from, row.target);
  const isInTo = isTargetInTo(to, row.target);
  const isLinkImport = isFileIn && isInTo;
  const isEndImport = isFileIn && !isInFrom;
  const isImport = isLinkQuery ? isLinkImport : isEndImport;
  const isImportedBy = !isLinkQuery && !isFileIn && isInFrom;

  if (isImport) walk.imports.push(row);

  if (isImportedBy) walk.importedBy.push(row);
};

/** A link query skips a file outside `from` before resolving any of its imports, since none can be a link row. */
const walkFile = (walk: SitesWalk, scanned: ScannedFile): void => {
  const isFileIn = isPathIn(walk.query.from, scanned.file);
  const isSkipped = walk.query.to !== null && !isFileIn;

  if (isSkipped) return;

  const fromDir = join(walk.context.dir, posix.dirname(scanned.file));

  for (const source of scanned.imports) {
    const target = memoTargetOf(walk.memo, walk.context, fromDir, source.specifier);
    const rowTarget = rowTargetOf(target, scanned.file);

    if (rowTarget === null) continue;

    const row: ModuleSiteRow = { file: scanned.file, source, target: rowTarget };

    collectRow(walk, row, isFileIn);
  }
};

/** By `file` in code-unit order, then by `source.line`. */
const bySite = (left: ModuleSiteRow, right: ModuleSiteRow): number => {
  if (left.file !== right.file) return left.file < right.file ? -1 : 1;

  return left.source.line - right.source.line;
};

/**
 * The import lines behind one module end (`to` null) or one link, resolved with the context `moduleGraphOf` builds:
 * walked files only, imports of other workspace packages on stubs, buckets and self-imports dropped. Pure.
 */
export const moduleSitesOf = (input: ModuleGraphInput, query: ModuleSitesQuery): ModuleSites => {
  const { dir, selfName, scan, others } = input;
  const walked = new Set(scan.walkedFiles);
  const context: ModuleResolveContext = { dir, selfName, walked, tsconfigPaths: scan.tsconfigPaths, others };
  const walk: SitesWalk = { context, memo: new Map(), query, imports: [], importedBy: [] };

  for (const scanned of scan.files) walkFile(walk, scanned);

  const imports = walk.imports.toSorted(bySite);
  const importedBy = walk.importedBy.toSorted(bySite);
  const sites: ModuleSites = { imports, importedBy };

  return sites;
};
