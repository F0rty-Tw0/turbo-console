import { describe, expect, it } from 'vitest';

import { affectedUpdateOf } from './affected-record.util.ts';
import { TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';

const VALID_TASKS = { 'app#build': 'changed', 'lib#build': 'dependency' };

const VALID = { mode: 'task', tasks: VALID_TASKS };

const MIXED_TASKS = { 'a#x': 'changed', 'b#x': 'loud', 'c#x': 7 };

const MIXED = { mode: 'package', tasks: MIXED_TASKS };

const KNOWN_TASKS = { 'a#x': 'changed' };

const KNOWN = { mode: 'package', tasks: KNOWN_TASKS };

const entryOf = (_: unknown, index: number): [string, string] => [`p#t${index}`, 'changed'];

const tasksOf = (length: number): Record<string, string> => {
  const entries = Array.from({ length }, entryOf);

  return Object.fromEntries(entries);
};

describe('FEATURE: affectedUpdateOf', () => {
  describe('GIVEN the affected field of a runs message', () => {
    it('WHEN it is a valid object THEN it is returned as mode and tasks', () => {
      expect(affectedUpdateOf(VALID)).toStrictEqual(VALID);
    });

    it('WHEN it is null THEN it is null, so every mark clears', () => {
      expect(affectedUpdateOf(null)).toBeNull();
    });

    it('WHEN it is absent THEN it is undefined, so the marks stay', () => {
      expect(affectedUpdateOf(undefined)).toBeUndefined();
    });

    it('WHEN an entry has an unknown mark word THEN that entry is dropped and the rest kept', () => {
      expect(affectedUpdateOf(MIXED)).toStrictEqual(KNOWN);
    });

    it('WHEN it has exactly TASK_COUNT_MAX entries THEN every entry is kept', () => {
      const update = affectedUpdateOf({ mode: 'task', tasks: tasksOf(TASK_COUNT_MAX) });

      expect(Object.keys(update?.tasks ?? {})).toHaveLength(TASK_COUNT_MAX);
    });

    it.each([
      ['a string', 'changed'],
      ['a number', 1],
      ['an array', []],
      ['an unknown mode', { mode: 'both', tasks: {} }],
      ['a missing mode', { tasks: {} }],
      ['tasks as an array', { mode: 'task', tasks: [] }],
      ['tasks as a string', { mode: 'task', tasks: 'x' }],
      ['tasks null', { mode: 'task', tasks: null }],
      ['more than TASK_COUNT_MAX entries', { mode: 'task', tasks: tasksOf(TASK_COUNT_MAX + 1) }]
    ])('WHEN it is %s THEN it is undefined, malformed, so the marks stay', (_label, value) => {
      expect(affectedUpdateOf(value)).toBeUndefined();
    });

    describe('WHEN its tasks parse a __proto__ key', () => {
      it('THEN the key is own data', () => {
        const parsed: unknown = JSON.parse('{"mode":"task","tasks":{"__proto__":"changed"}}');

        const update = affectedUpdateOf(parsed);

        expect(Object.hasOwn(update?.tasks ?? {}, '__proto__')).toBe(true);
      });

      it('THEN the prototype of the tasks is untouched', () => {
        const parsed: unknown = JSON.parse('{"mode":"task","tasks":{"__proto__":"changed"}}');

        const update = affectedUpdateOf(parsed);

        expect(Object.getPrototypeOf(update?.tasks)).toBe(Object.prototype);
      });
    });
  });
});
