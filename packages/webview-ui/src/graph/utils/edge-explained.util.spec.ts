import { describe, expect, it } from 'vitest';

import { isEdgeExplained } from './edge-explained.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import { MANIFEST_FIELDS } from '../../bridge/common/graph-message.const.ts';

const entryOf = (over: object = {}): object => {
  const entry = { field: 'dependencies', key: 'core', spec: '^1', line: 3, context: {}, ...over };

  return entry;
};

const withContext = (context: object, line = 3): object => entryOf({ context, line });

const foundOf = (entries: unknown[], over: object = {}): object => {
  const result = { kind: 'found', file: 'apps/web/package.json', entries, ...over };

  return result;
};

const explainedOf = (result: unknown, over: object = {}): UnknownRecord => {
  const message = { type: 'edgeExplained', source: 'web', target: 'core', result, ...over };

  return message;
};

const entriesOf = (count: number): object[] => Array.from({ length: count }, (): object => entryOf());

const fieldEntriesOf = (): object[] => MANIFEST_FIELDS.map((field): object => entryOf({ field }));

const longEntries = (): object[] => [entryOf({ key: 'k'.repeat(201), spec: 's'.repeat(201), line: 0 }), entryOf({ line: 1_000_000 })];

const SIDE_MAX = 'c'.repeat(201);

const OVER_SIDE = 'c'.repeat(202);

const MISSING = { kind: 'missing', file: 'package.json' };

const NO_TARGET = { type: 'edgeExplained', source: 'web', result: MISSING };

const ACCEPTED = [
  { label: 'one entry', record: explainedOf(foundOf([entryOf()])) },
  { label: 'eight entries', record: explainedOf(foundOf(entriesOf(8))) },
  { label: 'each of the four fields', record: explainedOf(foundOf(fieldEntriesOf())) },
  { label: 'key and spec of 201 characters, line 0 and 1 000 000', record: explainedOf(foundOf(longEntries())) },
  { label: 'missing', record: explainedOf(MISSING) },
  { label: 'unreadable, file of 1 024 characters', record: explainedOf({ kind: 'unreadable', file: 'f'.repeat(1_024) }) },
  { label: 'both context sides', record: explainedOf(foundOf([withContext({ before: 'a', after: 'b' })])) },
  { label: 'an empty context', record: explainedOf(foundOf([withContext({})])) },
  { label: 'context sides that are undefined', record: explainedOf(foundOf([withContext({ before: undefined, after: undefined })])) },
  { label: 'empty context sides', record: explainedOf(foundOf([withContext({ before: '', after: '' })])) },
  { label: 'context sides of 201 characters', record: explainedOf(foundOf([withContext({ before: SIDE_MAX, after: SIDE_MAX })])) },
  { label: 'line 0 and only an after side', record: explainedOf(foundOf([withContext({ after: 'b' }, 0)])) },
  { label: 'an extra context key', record: explainedOf(foundOf([withContext({ before: 'a', extra: 1 })])) },
  {
    label: 'names like Object members',
    record: explainedOf(foundOf([entryOf({ key: '__proto__' })]), { source: '__proto__', target: 'constructor' })
  }
];

const REJECTED = [
  { label: 'no entries', record: explainedOf(foundOf([])) },
  { label: 'nine entries', record: explainedOf(foundOf(entriesOf(9))) },
  { label: 'entries not an array', record: explainedOf(foundOf([], { entries: entryOf() })) },
  { label: 'a null entry', record: explainedOf(foundOf([null])) },
  { label: 'a sparse entries array of length 1', record: explainedOf(foundOf(new Array(1))) },
  { label: 'an unknown field', record: explainedOf(foundOf([entryOf({ field: 'scripts' })])) },
  { label: 'a field named like an Object member', record: explainedOf(foundOf([entryOf({ field: 'constructor' })])) },
  { label: 'a key of 202 characters', record: explainedOf(foundOf([entryOf({ key: 'k'.repeat(202) })])) },
  { label: 'a spec of 202 characters', record: explainedOf(foundOf([entryOf({ spec: 's'.repeat(202) })])) },
  { label: 'a numeric key', record: explainedOf(foundOf([entryOf({ key: 1 })])) },
  { label: 'a line of -1', record: explainedOf(foundOf([entryOf({ line: -1 })])) },
  { label: 'a line of 1 000 001', record: explainedOf(foundOf([entryOf({ line: 1_000_001 })])) },
  { label: 'a fractional line', record: explainedOf(foundOf([entryOf({ line: 1.5 })])) },
  { label: 'a NaN line', record: explainedOf(foundOf([entryOf({ line: NaN })])) },
  { label: 'a string line', record: explainedOf(foundOf([entryOf({ line: '3' })])) },
  { label: 'no context', record: explainedOf(foundOf([entryOf({ context: undefined })])) },
  { label: 'a null context', record: explainedOf(foundOf([entryOf({ context: null })])) },
  { label: 'a string context', record: explainedOf(foundOf([entryOf({ context: 'a' })])) },
  { label: 'a numeric context', record: explainedOf(foundOf([entryOf({ context: 1 })])) },
  { label: 'a before side of 202 characters', record: explainedOf(foundOf([withContext({ before: OVER_SIDE })])) },
  { label: 'an after side of 202 characters', record: explainedOf(foundOf([withContext({ after: OVER_SIDE })])) },
  { label: 'a numeric before side', record: explainedOf(foundOf([withContext({ before: 1 })])) },
  { label: 'a null after side', record: explainedOf(foundOf([withContext({ after: null })])) },
  { label: 'a before side on line 0', record: explainedOf(foundOf([withContext({ before: 'x' }, 0)])) },
  { label: 'an empty before side on line 0', record: explainedOf(foundOf([withContext({ before: '' }, 0)])) },
  { label: 'a file of 1 025 characters', record: explainedOf({ kind: 'missing', file: 'f'.repeat(1_025) }) },
  { label: 'a numeric file', record: explainedOf({ kind: 'unreadable', file: 1 }) },
  { label: 'missing with no file', record: explainedOf({ kind: 'missing' }) },
  { label: 'an unknown kind', record: explainedOf({ kind: 'found-ish', file: 'p' }) },
  { label: 'a null result', record: explainedOf(null) },
  { label: 'a numeric source', record: explainedOf(MISSING, { source: 1 }) },
  { label: 'no target', record: NO_TARGET }
];

describe('FEATURE: isEdgeExplained', () => {
  describe('GIVEN a well-formed edgeExplained record', () => {
    it.each(ACCEPTED)('WHEN it has $label THEN it is accepted', ({ record }) => {
      const isExplained = isEdgeExplained(record);

      expect(isExplained).toBe(true);
    });
  });

  describe('GIVEN a malformed edgeExplained record', () => {
    it.each(REJECTED)('WHEN it has $label THEN it is rejected', ({ record }) => {
      const isExplained = isEdgeExplained(record);

      expect(isExplained).toBe(false);
    });
  });
});
