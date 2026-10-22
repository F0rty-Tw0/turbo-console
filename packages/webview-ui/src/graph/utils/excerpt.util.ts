import { entryRowTextOf } from './details-text.util.ts';
import type { ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import type { ExcerptRow } from '../common/details.type.ts';

/** Leading whitespace is dropped so the excerpt fits the panel; inner spaces stay (D22). */
const rowOf = (number: number, text: string, isEntry: boolean): ExcerptRow => {
  const trimmed = text.trimStart();
  const row: ExcerptRow = { number, text: trimmed, isEntry };

  return row;
};

/** The entry's line with the lines around it, numbered 1-based; an absent side is left out, an empty one kept. */
export const excerptRowsOf = (entry: ManifestEntry): ExcerptRow[] => {
  const { before, after } = entry.context;
  const keyLine = entry.line + 1;
  const entryText = entryRowTextOf(entry);
  const rows = [rowOf(keyLine, entryText, true)];

  if (before !== undefined) rows.unshift(rowOf(keyLine - 1, before, false));

  if (after !== undefined) rows.push(rowOf(keyLine + 1, after, false));

  return rows;
};
