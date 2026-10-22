import { describe, expect, it } from 'vitest';

import { pluralOf } from './plural.util.ts';

describe('FEATURE: pluralOf', () => {
  describe('GIVEN the words task and tasks', () => {
    it.each([
      [0, '0 tasks'],
      [1, '1 task'],
      [2, '2 tasks']
    ])('WHEN the count is %i THEN the text is %s', (count, expected) => {
      const text = pluralOf(count, 'task', 'tasks');

      expect(text).toBe(expected);
    });
  });

  it('GIVEN an irregular plural WHEN the count is 1 THEN the singular is used', () => {
    const text = pluralOf(1, 'dependency', 'dependencies');

    expect(text).toBe('1 dependency');
  });
});
