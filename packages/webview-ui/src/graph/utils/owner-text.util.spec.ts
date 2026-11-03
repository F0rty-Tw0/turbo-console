import { describe, expect, it } from 'vitest';

import { ownerTextOf } from './owner-text.util.ts';
import { ROOT_TASKS_TITLE } from '../common/graph-task.const.ts';

const LABELS: ReadonlyMap<string, string> = new Map([['@org/x', 'x']]);

describe('FEATURE: ownerTextOf', () => {
  describe.each([
    ['//', 'single-app', 'single-app'],
    ['//', null, ROOT_TASKS_TITLE],
    ['@org/x', null, 'x'],
    ['@org/x', 'single-app', 'single-app'],
    ['ghost', null, 'ghost']
  ])('GIVEN package %s and label %s', (name, label, text) => {
    it('WHEN the owner text is read THEN it is the expected text', () => {
      expect(ownerTextOf(name, label, LABELS)).toBe(text);
    });
  });
});
