import { describe, expect, it } from 'vitest';

import { refocusOf } from './refocus.util.ts';
import type { Refocus } from '../common/graph-details.type.ts';

type RefocusRow = {
  readonly title: string;
  readonly focused: string | null;
  readonly names: string[];
  readonly expected: Refocus;
};

const ROWS: RefocusRow[] = [
  { title: 'no item had focus', focused: null, names: ['a'], expected: 'none' },
  { title: 'the focused item is still listed', focused: 'a', names: ['a', 'b'], expected: 'item' },
  { title: 'the focused item is gone', focused: 'c', names: ['a', 'b'], expected: 'heading' },
  { title: 'the list is empty', focused: 'a', names: [], expected: 'heading' },
  { title: 'the focused item is __proto__ and still listed', focused: '__proto__', names: ['__proto__'], expected: 'item' }
];

describe('FEATURE: refocusOf', () => {
  describe('GIVEN a list rebuilt in place', () => {
    it.each(ROWS)('WHEN $title THEN focus goes to $expected', (row) => {
      const refocus = refocusOf(row.focused, row.names);

      expect(refocus).toBe(row.expected);
    });
  });
});
