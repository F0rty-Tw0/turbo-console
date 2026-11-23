import { moduleSitesOf } from '@turbo-console/core';
import type { ModuleSiteRow, ModuleSitesQuery, PackageImportScan } from '@turbo-console/core';
import { IMPORT_SITES_MAX, MANIFEST_FILE_MAX, MANIFEST_LINE_MAX, MODULE_STUB_NAME_MAX } from '@turbo-console/webview-ui';
import type { ImportKind, ModuleSite, ModuleSitesFound, ModuleSitesResult } from '@turbo-console/webview-ui';

import { cutEntryText } from './entry-text.util.ts';
import { moduleInputOf } from './modules-answer.util.ts';
import type { ModulesContext } from '../common/import-match.type.ts';

const isTargetSendable = (row: ModuleSiteRow): boolean => {
  const { target } = row;

  if (target.kind === 'file') return target.path.length <= MANIFEST_FILE_MAX;

  return target.name.length <= MODULE_STUB_NAME_MAX;
};

const isSendable = (row: ModuleSiteRow): boolean =>
  row.file.length <= MANIFEST_FILE_MAX && row.source.line <= MANIFEST_LINE_MAX && isTargetSendable(row);

const siteOf = (row: ModuleSiteRow): ModuleSite => {
  const { file, source, target } = row;
  const kind: ImportKind = source.kind;
  const site: ModuleSite = {
    file,
    line: source.line,
    text: cutEntryText(source.text.trimStart()),
    kind,
    isType: source.isType,
    target
  };

  return site;
};

const sentOf = (rows: ModuleSiteRow[]): ModuleSite[] => rows.filter(isSendable).slice(0, IMPORT_SITES_MAX).map(siteOf);

/**
 * The sites reply for one module end or link from one scan of its package (spec §5.1, §5.4): `moduleSitesOf` over
 * `moduleInputOf`, already sorted. A row whose file, line, or target path or stub name is over its cap is not sent; the
 * first `IMPORT_SITES_MAX` sendable rows of each list are, and each `*Total` counts the whole list. No rows gives `found`
 * with empty lists. Never mutates `scan`: its arrays are the import cache's own.
 */
export const answerModuleSites = (scan: PackageImportScan, ctx: ModulesContext, query: ModuleSitesQuery): ModuleSitesResult => {
  const rows = moduleSitesOf(moduleInputOf(scan, ctx), query);
  const found: ModuleSitesFound = {
    kind: 'found',
    imports: sentOf(rows.imports),
    importsTotal: rows.imports.length,
    importedBy: sentOf(rows.importedBy),
    importedByTotal: rows.importedBy.length,
    limit: scan.limit
  };

  return found;
};
