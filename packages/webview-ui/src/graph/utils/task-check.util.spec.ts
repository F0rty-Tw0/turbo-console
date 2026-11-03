import { describe, expect, it } from 'vitest';

import { checkStateOf, chosenAfter } from './task-check.util.ts';
import type { GroupState } from '../common/graph-controls.type.ts';

describe('FEATURE: task check state', () => {
  describe('GIVEN a group of two task ids', () => {
    const ids = ['a#b', 'a#c'];
    const table: [string, GroupState, string[]][] = [
      ['none chosen', 'unchecked', []],
      ['one chosen', 'mixed', ['a#b']],
      ['both chosen', 'checked', ['a#b', 'a#c']],
      ['both chosen and an id outside the group', 'checked', ['a#b', 'a#c', 'gone#x']],
      ['only an id outside the group chosen', 'unchecked', ['gone#x']]
    ];

    it.each(table)('WHEN %s THEN the state is %s', (_title, state, chosenIds) => {
      const chosen = new Set(chosenIds);

      const result = checkStateOf(ids, chosen);

      expect(result).toBe(state);
    });
  });

  it('GIVEN a group with no ids WHEN the state is read THEN it is unchecked', () => {
    const result = checkStateOf([], new Set(['a#b']));

    expect(result).toBe('unchecked');
  });

  describe('GIVEN a choice and the ids of a line', () => {
    const table: [string, string[], string[], boolean, string[]][] = [
      ['checking adds the ids', ['x#a'], ['y#b', 'y#c'], true, ['x#a', 'y#b', 'y#c']],
      ['checking adds no duplicate', ['x#a', 'y#b'], ['y#b', 'y#c'], true, ['x#a', 'y#b', 'y#c']],
      ['unchecking removes the ids', ['x#a', 'y#b', 'y#c'], ['y#b', 'y#c'], false, ['x#a']],
      ['unchecking what is not chosen', ['x#a'], ['y#b'], false, ['x#a']],
      ['unchecking keeps an id outside the line', ['hidden#fmt', 'y#b'], ['y#b'], false, ['hidden#fmt']]
    ];

    it.each(table)('WHEN %s THEN the choice is the expected one', (...row) => {
      const [, chosen, ids, isChecked, expected] = row;

      const result = chosenAfter(chosen, ids, isChecked);

      expect(result).toStrictEqual(expected);
    });
  });
});
