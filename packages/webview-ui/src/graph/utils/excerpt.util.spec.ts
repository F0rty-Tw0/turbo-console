import { describe, expect, it } from 'vitest';

import { excerptRowsOf } from './excerpt.util.ts';
import type { ManifestContext, ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import type { ExcerptRow } from '../common/details.type.ts';

const ENTRY: ManifestEntry = { field: 'dependencies', key: 'ui', spec: '^1.0.0', line: 9, context: {} };

const ENTRY_TEXT = '"ui": "^1.0.0"';

const rowOf = (number: number, text: string, isEntry: boolean): ExcerptRow => {
  const row: ExcerptRow = { number, text, isEntry };

  return row;
};

const entryWith = (context: ManifestContext): ManifestEntry => {
  const entry: ManifestEntry = { ...ENTRY, context };

  return entry;
};

const ENTRY_ROW = rowOf(10, ENTRY_TEXT, true);

const BOTH_SIDES: ManifestContext = { before: '  "name": "web",', after: '  },' };

const BEFORE_ONLY: ManifestContext = { before: 'x' };

const AFTER_ONLY: ManifestContext = { after: 'y' };

const EMPTY_BEFORE: ManifestContext = { before: '' };

const INDENTED_BEFORE: ManifestContext = { before: '\t\t"a":   1,' };

const TRAILING_AFTER: ManifestContext = { after: '  "b": 2,  ' };

type ContextRow = {
  readonly title: string;
  readonly context: ManifestContext;
  readonly expected: ExcerptRow[];
};

const ROWS: ContextRow[] = [
  { title: 'both sides', context: BOTH_SIDES, expected: [rowOf(9, '"name": "web",', false), ENTRY_ROW, rowOf(11, '},', false)] },
  { title: 'no side', context: {}, expected: [ENTRY_ROW] },
  { title: 'only the line before', context: BEFORE_ONLY, expected: [rowOf(9, 'x', false), ENTRY_ROW] },
  { title: 'only the line after', context: AFTER_ONLY, expected: [ENTRY_ROW, rowOf(11, 'y', false)] },
  { title: 'an empty line before', context: EMPTY_BEFORE, expected: [rowOf(9, '', false), ENTRY_ROW] },
  { title: 'an indented line before', context: INDENTED_BEFORE, expected: [rowOf(9, '"a":   1,', false), ENTRY_ROW] },
  { title: 'trailing spaces after', context: TRAILING_AFTER, expected: [ENTRY_ROW, rowOf(11, '"b": 2,  ', false)] }
];

describe('FEATURE: excerptRowsOf', () => {
  describe('GIVEN the entry "ui": "^1.0.0" on 0-based line 9', () => {
    it.each(ROWS)('WHEN its context has $title THEN the rows are numbered from 1, trimmed at the start', (row) => {
      const entry = entryWith(row.context);

      const rows = excerptRowsOf(entry);

      expect(rows).toStrictEqual(row.expected);
    });
  });

  describe('GIVEN an entry with no context', () => {
    it('WHEN its key is __proto__ THEN the entry row holds the key as text', () => {
      const entry: ManifestEntry = { ...ENTRY, key: '__proto__', spec: 'x' };

      const rows = excerptRowsOf(entry);

      expect(rows).toStrictEqual([rowOf(10, '"__proto__": "x"', true)]);
    });

    it('WHEN its spec is the source text of a number THEN the entry row quotes it', () => {
      const entry: ManifestEntry = { ...ENTRY, spec: '1' };

      const rows = excerptRowsOf(entry);

      expect(rows).toStrictEqual([rowOf(10, '"ui": "1"', true)]);
    });
  });
});
