import type { DrawnEnds, MergedLink } from '../common/merged-links.type.ts';

/**
 * The items merged per drawn (source, target) pair, in first-appearance order. `endsOf` gives null for an item that is
 * not drawn; a pair whose source equals its target is dropped. `combine` gets null for the first item of a pair, then the
 * value it returned last.
 */
export const mergedLinksOf = <TItem, TValue>(
  items: TItem[],
  endsOf: (item: TItem) => DrawnEnds | null,
  combine: (acc: TValue | null, item: TItem) => TValue
): MergedLink<TValue>[] => {
  const byPair = new Map<string, MergedLink<TValue>>();

  for (const item of items) {
    const ends = endsOf(item);

    if (ends === null) continue;

    if (ends.source === ends.target) continue;

    const key = JSON.stringify([ends.source, ends.target]);
    const existing = byPair.get(key);
    const acc = existing === undefined ? null : existing.value;
    const value = combine(acc, item);
    const link: MergedLink<TValue> = { source: ends.source, target: ends.target, value };

    byPair.set(key, link);
  }

  const links = byPair.values();

  return [...links];
};
