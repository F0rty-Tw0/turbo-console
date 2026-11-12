import { describe, expect, it } from 'vitest';

import { ownerTextOf } from './owner-text.util.ts';
import { ROOT_TASKS_TITLE } from '../common/graph-task.const.ts';

const LABELS: ReadonlyMap<string, string> = new Map([['@org/x', 'x']]);

const ROOT_LABELS: ReadonlyMap<string, string> = new Map([['//', 'root-fixture']]);

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

  describe('GIVEN labels that hold the monorepo root //', () => {
    it('WHEN the owner text of // is read THEN it is the root label', () => {
      expect(ownerTextOf('//', null, ROOT_LABELS)).toBe('root-fixture');
    });
  });
});
