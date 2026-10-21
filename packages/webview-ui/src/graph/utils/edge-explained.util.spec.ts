import { describe, expect, it } from 'vitest';

import { isEdgeExplained } from './edge-explained.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import { MANIFEST_FIELDS } from '../../bridge/common/graph-message.const.ts';

const entryOf = (over: object = {}): object => {
  const entry = { field: 'dependencies', key: 'core', spec: '^1', line: 3, ...over };

  return entry;
};

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

const MISSING = { kind: 'missing', file: 'package.json' };

const ACCEPTED: [string, UnknownRecord][] = [
  ['one entry', explainedOf(foundOf([entryOf()]))],
  ['eight entries', explainedOf(foundOf(entriesOf(8)))],
  ['each of the four fields', explainedOf(foundOf(fieldEntriesOf()))],
  ['key and spec of 201 characters, line 0 and 1 000 000', explainedOf(foundOf(longEntries()))],
  ['missing', explainedOf(MISSING)],
  ['unreadable, file of 1 024 characters', explainedOf({ kind: 'unreadable', file: 'f'.repeat(1_024) })],
  ['names like Object members', explainedOf(foundOf([entryOf({ key: '__proto__' })]), { source: '__proto__', target: 'constructor' })]
];

const REJECTED: [string, UnknownRecord][] = [
  ['no entries', explainedOf(foundOf([]))],
  ['nine entries', explainedOf(foundOf(entriesOf(9)))],
  ['entries not an array', explainedOf(foundOf([], { entries: entryOf() }))],
  ['a null entry', explainedOf(foundOf([null]))],
  ['an unknown field', explainedOf(foundOf([entryOf({ field: 'scripts' })]))],
  ['a field named like an Object member', explainedOf(foundOf([entryOf({ field: 'constructor' })]))],
  ['a key of 202 characters', explainedOf(foundOf([entryOf({ key: 'k'.repeat(202) })]))],
  ['a spec of 202 characters', explainedOf(foundOf([entryOf({ spec: 's'.repeat(202) })]))],
  ['a numeric key', explainedOf(foundOf([entryOf({ key: 1 })]))],
  ['a line of -1', explainedOf(foundOf([entryOf({ line: -1 })]))],
  ['a line of 1 000 001', explainedOf(foundOf([entryOf({ line: 1_000_001 })]))],
  ['a fractional line', explainedOf(foundOf([entryOf({ line: 1.5 })]))],
  ['a NaN line', explainedOf(foundOf([entryOf({ line: NaN })]))],
  ['a string line', explainedOf(foundOf([entryOf({ line: '3' })]))],
  ['a file of 1 025 characters', explainedOf({ kind: 'missing', file: 'f'.repeat(1_025) })],
  ['a numeric file', explainedOf({ kind: 'unreadable', file: 1 })],
  ['missing with no file', explainedOf({ kind: 'missing' })],
  ['an unknown kind', explainedOf({ kind: 'found-ish', file: 'p' })],
  ['a null result', explainedOf(null)],
  ['a numeric source', explainedOf(MISSING, { source: 1 })],
  ['no target', { type: 'edgeExplained', source: 'web', result: MISSING }]
];

describe('FEATURE: isEdgeExplained', () => {
  describe('GIVEN a well-formed edgeExplained record', () => {
    it.each(ACCEPTED)('WHEN it has %s THEN it is accepted', (_label, record) => {
      const isExplained = isEdgeExplained(record);

      expect(isExplained).toBe(true);
    });
  });

  describe('GIVEN a malformed edgeExplained record', () => {
    it.each(REJECTED)('WHEN it has %s THEN it is rejected', (_label, record) => {
      const isExplained = isEdgeExplained(record);

      expect(isExplained).toBe(false);
    });
  });
});
