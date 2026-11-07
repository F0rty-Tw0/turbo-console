import { pluralOf } from './plural.util.ts';
import type { ImportSite } from '../../bridge/common/graph-imports.type.ts';
import { KIND_TAGS, TYPE_TAG, VIA_TAGS } from '../common/details-imports.const.ts';

const isTag = (tag: string | null): tag is string => tag !== null;

/** `count` is `null` while no list is known: only a found reply has one. */
export const importsHeadingOf = (target: string, count: number | null): string => {
  if (count === null) return `Imports of ${target}`;

  return `Imports of ${target} (${count})`;
};

export const scanAgainLabelOf = (source: string, target: string): string => `Scan ${source} for imports of ${target} again`;

export const lookingTextOf = (source: string, target: string): string => `Looking for imports of ${target} in ${source}…`;

export const noneTextOf = (source: string, target: string, scanned: number): string => {
  const files = pluralOf(scanned, 'file', 'files');

  return `No file in ${source} imports ${target} (${files} scanned).`;
};

export const failedTextOf = (source: string): string => `Couldn't read the files of ${source}.`;

/** `line` is 0-based, as the host sends it; the label counts from 1 like an editor. It ends with the import text, so the accessible name holds the visible text. */
export const openImportLabelOf = (file: string, line: number, text: string): string => `Open ${file} at line ${line + 1}: ${text}`;

export const showMoreTextOf = (count: number): string => `Show ${count} more`;

export const showingTextOf = (shown: number, total: number): string => `Showing ${shown} of ${total} imports.`;

export const skippedTextOf = (scanned: number, skipped: number): string => {
  const files = pluralOf(scanned, 'file', 'files');

  return `Scanned ${files}, skipped ${skipped} (over 1 MiB, unreadable or path too long).`;
};

/** The tags of a row, in the order type, kind, via; a plain static import by name has none. */
export const tagsOf = (site: ImportSite): string[] => {
  const typeTag = site.isType ? TYPE_TAG : null;
  const candidates = [typeTag, KIND_TAGS[site.kind], VIA_TAGS[site.via]];

  return candidates.filter(isTag);
};
