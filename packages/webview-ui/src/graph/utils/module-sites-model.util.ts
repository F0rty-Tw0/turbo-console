import { byCodeUnit } from './folder-group.util.ts';
import { foundTextOf, openImportLabelOf, showMoreTextOf, showingTextOf } from './imports-text.util.ts';
import { sitesHeadingOf, sitesScanLabelOf } from './module-text.util.ts';
import type { ModuleSite, ModuleSitesFound } from '../../bridge/common/graph-module-sites.type.ts';
import {
  IMPORTS_FOLD_AT,
  KIND_TAGS,
  LIMIT_NOTES,
  NO_IMPORTS_WORD,
  SCANNING_AGAIN_TEXT,
  SCANNING_STATUS_TEXT,
  SCAN_FAILED_STATUS_TEXT,
  SCAN_FAILED_WORD,
  TYPE_TAG
} from '../common/details-imports.const.ts';
import type { ImportGroupModel, ImportRowModel, ImportsStatus, ImportsViewModel } from '../common/details-imports.type.ts';
import type { ModuleSitesState } from '../common/module-details.type.ts';

type SitesList = 'imports' | 'importedBy' | 'link';

type SiteGroupOf = (site: ModuleSite) => string;

const FAILED_STATUS: ImportsStatus = { icon: 'warning', word: SCAN_FAILED_WORD };

const NONE_STATUS: ImportsStatus = { icon: 'info', word: NO_IMPORTS_WORD };

/** A target's label: the file's path, or the stub's package name. */
const labelOf = (target: ModuleSite['target']): string => (target.kind === 'file' ? target.path : target.name);

const targetLabelOf = (site: ModuleSite): string => labelOf(site.target);

const importingFileOf = (site: ModuleSite): string => site.file;

const byTargetLabel = (left: ModuleSite, right: ModuleSite): number => byCodeUnit(targetLabelOf(left), targetLabelOf(right));

/** The type tag, then the kind tag; sites have no via. */
const tagsOfSite = (site: ModuleSite): string[] => {
  const tags: string[] = [];
  const kindTag = KIND_TAGS[site.kind];

  if (site.isType) tags.push(TYPE_TAG);

  if (kindTag !== null) tags.push(kindTag);

  return tags;
};

const rowOf = (site: ModuleSite): ImportRowModel => {
  const key = `${site.file}:${site.line}`;
  const number = String(site.line + 1);
  const tags = tagsOfSite(site);
  const label = openImportLabelOf(site.file, site.line, site.text);
  const row: ImportRowModel = { key, file: site.file, line: site.line, number, text: site.text, tags, label };

  return row;
};

const groupsOf = (sites: ModuleSite[], groupOf: SiteGroupOf): ImportGroupModel[] => {
  const byLabel = new Map<string, ImportGroupModel>();

  for (const site of sites) {
    const row = rowOf(site);
    const file = groupOf(site);
    const held = byLabel.get(file);

    if (held) {
      held.rows.push(row);
    } else {
      const group: ImportGroupModel = { file, rows: [row] };

      byLabel.set(file, group);
    }
  }

  return Array.from(byLabel.values());
};

/** Imports read by target label (a stable sort keeps the host's file-then-line order inside a label); the others keep host order. */
const orderedOf = (sites: ModuleSite[], list: SitesList): ModuleSite[] => {
  if (list !== 'imports') return sites;

  return sites.toSorted(byTargetLabel);
};

const moreOf = (count: number, isOpen: boolean): string | null => {
  const isFolded = !isOpen && count > IMPORTS_FOLD_AT;

  if (!isFolded) return null;

  return showMoreTextOf(count - IMPORTS_FOLD_AT);
};

const notesOf = (result: ModuleSitesFound, sent: number, total: number): string[] => {
  const notes: string[] = [];

  if (total > sent) notes.push(showingTextOf(sent, total));

  if (result.limit !== null) notes.push(LIMIT_NOTES[result.limit]);

  return notes;
};

/** The first `IMPORTS_FOLD_AT` rows in display order while folded, so the fold follows the grouping. */
const shownOf = (ordered: ModuleSite[], isOpen: boolean): ModuleSite[] => {
  if (isOpen) return ordered;

  return ordered.slice(0, IMPORTS_FOLD_AT);
};

const foundModelOf = (result: ModuleSitesFound, list: SitesList, heading: string, isOpen: boolean): ImportsViewModel => {
  const isImportedBy = list === 'importedBy';
  const sites = isImportedBy ? result.importedBy : result.imports;
  const total = isImportedBy ? result.importedByTotal : result.importsTotal;
  const isNone = total === 0;
  const shown = shownOf(orderedOf(sites, list), isOpen);
  const groupOf = list === 'imports' ? targetLabelOf : importingFileOf;
  const foundText = foundTextOf(total);
  const count = isNone ? null : total;
  const status = isNone ? NONE_STATUS : null;
  const statusText = isNone ? NO_IMPORTS_WORD : foundText;
  const groups = groupsOf(shown, groupOf);
  const model: ImportsViewModel = {
    heading: sitesHeadingOf(heading, count),
    scanLabel: sitesScanLabelOf(heading),
    isScanning: false,
    status,
    statusText,
    lines: [],
    groups,
    more: moreOf(sites.length, isOpen),
    notes: notesOf(result, sites.length, total)
  };

  return model;
};

/** No package names here, unlike package mode's `lookingTextOf`, so the visible line reuses the status copy. */
const SCANNING_LINE = `${SCANNING_STATUS_TEXT}…`;

const emptyModelOf = (heading: string, isScanning: boolean): ImportsViewModel => {
  const status = isScanning ? null : FAILED_STATUS;
  const statusText = isScanning ? SCANNING_STATUS_TEXT : SCAN_FAILED_STATUS_TEXT;
  const scanningLines = [SCANNING_LINE];
  const noLines: string[] = [];
  const lines = isScanning ? scanningLines : noLines;
  const model: ImportsViewModel = {
    heading: sitesHeadingOf(heading, null),
    scanLabel: sitesScanLabelOf(heading),
    isScanning,
    status,
    statusText,
    lines,
    groups: [],
    more: null,
    notes: []
  };

  return model;
};

/** What one sites block shows for `state`; `list` picks the sites and their grouping, `isOpen` the fold past `IMPORTS_FOLD_AT` rows (spec §6.4). */
export const moduleSitesModelOf = (state: ModuleSitesState, list: SitesList, heading: string, isOpen: boolean): ImportsViewModel => {
  if (state.kind === 'found') return foundModelOf(state.result, list, heading, isOpen);

  if (state.kind === 'failed') return emptyModelOf(heading, false);

  if (state.previous === null) return emptyModelOf(heading, true);

  const previous = foundModelOf(state.previous, list, heading, isOpen);
  const lines = [SCANNING_AGAIN_TEXT, ...previous.lines];
  const model: ImportsViewModel = { ...previous, isScanning: true, lines };

  return model;
};
