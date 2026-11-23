import { describe, expect, it } from 'vitest';

import { mergedLinksOf } from './merged-links.util.ts';
import type { DrawnEnds } from '../common/merged-links.type.ts';

type Item = { readonly from: string; readonly to: string; readonly weight: number };

const endsOf = (item: Item): DrawnEnds | null => {
  if (item.from === 'hidden') return null;

  const ends: DrawnEnds = { source: item.from, target: item.to };

  return ends;
};

const sum = (acc: number | null, item: Item): number => (acc ?? 0) + item.weight;

describe('FEATURE: merged links', () => {
  describe('GIVEN items over three pairs, a self-pair and an item with no drawn ends', () => {
    const items: Item[] = [
      { from: 'b', to: 'c', weight: 1 },
      { from: 'a', to: 'b', weight: 2 },
      { from: 'b', to: 'c', weight: 4 },
      { from: 'a', to: 'a', weight: 8 },
      { from: 'hidden', to: 'a', weight: 16 },
      { from: 'c', to: 'b', weight: 32 }
    ];

    it('WHEN merged THEN each pair keeps its first-appearance place and folds its items', () => {
      expect(mergedLinksOf(items, endsOf, sum)).toStrictEqual([
        { source: 'b', target: 'c', value: 5 },
        { source: 'a', target: 'b', value: 2 },
        { source: 'c', target: 'b', value: 32 }
      ]);
    });
  });

  describe('GIVEN ends whose names hold JSON punctuation', () => {
    it('WHEN merged THEN pairs that would join as one string stay apart', () => {
      const items: Item[] = [
        { from: 'a","b', to: 'c', weight: 1 },
        { from: 'a', to: 'b","c', weight: 2 }
      ];

      expect(mergedLinksOf(items, endsOf, sum)).toHaveLength(2);
    });
  });

  describe('GIVEN a combine that records what it gets', () => {
    it('WHEN two items share a pair THEN combine gets null first, then its last value', () => {
      const seen: (number | null)[] = [];
      const record = (acc: number | null, item: Item): number => {
        seen.push(acc);

        return item.weight;
      };
      const items: Item[] = [
        { from: 'a', to: 'b', weight: 1 },
        { from: 'a', to: 'b', weight: 2 }
      ];

      mergedLinksOf(items, endsOf, record);

      expect(seen).toStrictEqual([null, 1]);
    });
  });
});
