import type { GraphAtomCounts } from '../../bridge/common/graph-message.type.ts';
import { atomCountsText } from '../../bridge/utils/atom-counts-text.util.ts';

// grug: slice-1 shim; the chips slice draws counts as DOM
/** The counts line of each umbrella, for the canvas label that still draws counts as text. */
export const countTextsOf = (counts: ReadonlyMap<string, GraphAtomCounts>): ReadonlyMap<string, string> => {
  const textOf = ([id, umbrellaCounts]: [string, GraphAtomCounts]): [string, string] => [id, atomCountsText(umbrellaCounts)];
  const countEntries = [...counts];
  const entries = countEntries.map(textOf);

  return new Map(entries);
};
