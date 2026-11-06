import {
  failedTextOf,
  importsHeadingOf,
  lookingTextOf,
  noneTextOf,
  openImportLabelOf,
  scanAgainLabelOf,
  showMoreTextOf,
  showingTextOf,
  skippedTextOf,
  tagsOf
} from './imports-text.util.ts';
import type { ImportSite } from '../../bridge/common/graph-imports.type.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import {
  IMPORTS_FOLD_AT,
  LIMIT_NOTES,
  NONE_IN_SCANNED_WORD,
  NO_IMPORTS_WORD,
  SCANNING_AGAIN_TEXT,
  SCAN_FAILED_WORD
} from '../common/details-imports.const.ts';
import type { ImportGroupModel, ImportRowModel, ImportsStatus, ImportsViewModel } from '../common/details-imports.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';

const FAILED_STATUS: ImportsStatus = { icon: 'warning', word: SCAN_FAILED_WORD };

const sitesOf = (state: ImportsState): ImportSite[] => {
  if (state.kind === 'found') return state.sites;

  return [];
};

const countOf = (state: ImportsState): number | null => {
  if (state.kind === 'found') return state.total;

  return null;
};

const isRefreshingOf = (state: ImportsState): boolean => {
  if (state.kind === 'found' || state.kind === 'none') return state.isRefreshing;

  return false;
};

const statusOf = (state: ImportsState): ImportsStatus | null => {
  if (state.kind === 'failed') return FAILED_STATUS;

  if (state.kind !== 'none') return null;

  const word = state.skipped > 0 ? NONE_IN_SCANNED_WORD : NO_IMPORTS_WORD;
  const status: ImportsStatus = { icon: 'info', word };

  return status;
};

const stateLinesOf = (state: ImportsState, link: GraphEdge): string[] => {
  if (state.kind === 'scanning') return [lookingTextOf(link.source, link.target)];

  if (state.kind === 'none') return [noneTextOf(link.source, link.target, state.scanned)];

  if (state.kind === 'failed') return [failedTextOf(link.source)];

  return [];
};

const linesOf = (state: ImportsState, link: GraphEdge): string[] => {
  const stateLines = stateLinesOf(state, link);
  const isRefreshing = isRefreshingOf(state);

  if (!isRefreshing) return stateLines;

  return [SCANNING_AGAIN_TEXT, ...stateLines];
};

const rowOf = (site: ImportSite): ImportRowModel => {
  const key = `${site.file}:${site.line}`;
  const number = String(site.line + 1);
  const tags = tagsOf(site);
  const label = openImportLabelOf(site.file, site.line);
  const row: ImportRowModel = { key, file: site.file, line: site.line, number, text: site.text, tags, label };

  return row;
};

const groupsOf = (sites: ImportSite[]): ImportGroupModel[] => {
  const byFile = new Map<string, ImportGroupModel>();

  for (const site of sites) {
    const group = byFile.get(site.file) ?? { file: site.file, rows: [] };

    group.rows.push(rowOf(site));
    byFile.set(site.file, group);
  }

  return Array.from(byFile.values());
};

const moreOf = (count: number, isOpen: boolean): string | null => {
  const isFolded = !isOpen && count > IMPORTS_FOLD_AT;

  if (!isFolded) return null;

  return showMoreTextOf(count - IMPORTS_FOLD_AT);
};

const shownOf = (sites: ImportSite[], isOpen: boolean): ImportSite[] => {
  if (isOpen) return sites;

  return sites.slice(0, IMPORTS_FOLD_AT);
};

const notesOf = (state: ImportsState, count: number): string[] => {
  if (state.kind === 'scanning' || state.kind === 'failed') return [];

  const notes: string[] = [];

  if (state.kind === 'found' && state.total > count) notes.push(showingTextOf(count, state.total));

  if (state.skipped > 0) notes.push(skippedTextOf(state.scanned, state.skipped));

  if (state.limit !== null) notes.push(LIMIT_NOTES[state.limit]);

  return notes;
};

/** What the imports block shows for `state` of `link`; `isOpen` is the fold, open past `IMPORTS_FOLD_AT` rows (spec D14). */
export const importsModelOf = (state: ImportsState, link: GraphEdge, isOpen: boolean): ImportsViewModel => {
  const sites = sitesOf(state);
  const shown = shownOf(sites, isOpen);
  const isScanning = state.kind === 'scanning' || isRefreshingOf(state);
  const model: ImportsViewModel = {
    heading: importsHeadingOf(link.target, countOf(state)),
    scanLabel: scanAgainLabelOf(link.source, link.target),
    isScanning,
    status: statusOf(state),
    lines: linesOf(state, link),
    groups: groupsOf(shown),
    more: moreOf(sites.length, isOpen),
    notes: notesOf(state, sites.length)
  };

  return model;
};
