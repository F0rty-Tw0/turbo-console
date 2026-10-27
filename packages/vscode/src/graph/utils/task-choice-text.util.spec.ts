import { describe, expect, it } from 'vitest';

import { manyTasksTextOf, showAllLabelOf } from './task-choice-text.util.ts';

describe('FEATURE: the Show All Task Graphs warning texts', () => {
  describe('GIVEN 301 tasks', () => {
    it('WHEN the warning is worded THEN it names the count and the 300 cap', () => {
      expect(manyTasksTextOf(301)).toBe('This workspace has 301 tasks. Drawing more than 300 can be slow.');
    });

    it('WHEN the button is worded THEN it names the count', () => {
      expect(showAllLabelOf(301)).toBe('Show all 301');
    });
  });
});
