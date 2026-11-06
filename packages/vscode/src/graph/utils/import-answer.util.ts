import { join, posix } from 'node:path';

import type { PackageImportScan, SourceImport } from '@turbo-console/core';
import { IMPORT_SITES_MAX, MANIFEST_FILE_MAX } from '@turbo-console/webview-ui';
import type { EdgeImportsResult, ImportKind, ImportLimit, ImportSite, ImportVia } from '@turbo-console/webview-ui';

import { cut } from './entry-text.util.ts';
import { importMatchOf } from './import-match.util.ts';
import type { ImportEdge } from '../common/import-match.type.ts';

type Match = {
  readonly file: string;
  readonly source: SourceImport;
  readonly via: ImportVia;
};

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;

  return left > right ? 1 : 0;
};

const compareMatch = (left: Match, right: Match): number => {
  const byFile = compareText(left.file, right.file);
  const byLine = left.source.line - right.source.line;

  return byFile === 0 ? byLine : byFile;
};

const isSendable = (match: Match): boolean => match.file.length <= MANIFEST_FILE_MAX;

const siteOf = (match: Match): ImportSite => {
  const { file, source, via } = match;
  const kind: ImportKind = source.kind;
  const site: ImportSite = {
    file,
    line: source.line,
    specifier: cut(source.specifier),
    text: cut(source.text.trimStart()),
    kind,
    isType: source.isType,
    via
  };

  return site;
};

const matchesOf = (scan: PackageImportScan, edge: ImportEdge): Match[] => {
  const matches: Match[] = [];

  for (const scanned of scan.files) {
    const fromDir = join(edge.sourceDir, posix.dirname(scanned.file));

    for (const source of scanned.imports) {
      const via = importMatchOf(source.specifier, fromDir, edge);

      if (via !== null) matches.push({ file: scanned.file, source, via });
    }
  }

  return matches;
};

/**
 * The D11 reply for edge A → B from one scan of A: every import `importMatchOf` matches, sorted by file then line, at
 * most `IMPORT_SITES_MAX` sent, each `text` / `specifier` cut (D13). A file whose path is over `MANIFEST_FILE_MAX` sends
 * no site but counts its sites in `total` and moves from `scanned` to `skipped`; `none` when no site is left. Never
 * mutates `scan`: its arrays are the import cache's own (U8b).
 */
export const answerImports = (scan: PackageImportScan, edge: ImportEdge): EdgeImportsResult => {
  const matches = matchesOf(scan, edge);
  const kept = matches.filter(isSendable);
  const droppedFiles = new Set(matches.filter((match) => !isSendable(match)).map((match) => match.file));
  const sites = kept.toSorted(compareMatch).slice(0, IMPORT_SITES_MAX).map(siteOf);
  const scanned = scan.scanned - droppedFiles.size;
  const skipped = scan.skipped + droppedFiles.size;
  const limit: ImportLimit | null = scan.limit;

  if (sites.length === 0) {
    const none: EdgeImportsResult = { kind: 'none', scanned, skipped, limit };

    return none;
  }

  const found: EdgeImportsResult = { kind: 'found', scanned, skipped, total: matches.length, sites, limit };

  return found;
};
