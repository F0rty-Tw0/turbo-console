import { describe, expect, it } from 'vitest';

import { collapsedLabelOf } from './collapsed-label.util.ts';

const measureOf = (text: string): number => text.length * 7;

describe('FEATURE: collapsedLabelOf', () => {
  describe.each([
    ['apps', 2, 'apps\n2 packages'],
    ['apps', 1, 'apps\n1 package'],
    ['(root)', 1, '(root)\n1 package'],
    ['./(root)', 1, './(root)\n1 package'],
    ['sixteen-chars-ok', 3, 'sixteen-chars-ok\n3 packages']
  ])('GIVEN the title %j fits and %i packages', (title, count, expected) => {
    const shown = JSON.stringify(expected);

    it(`WHEN the label is built THEN it is ${shown}`, () => {
      const label = collapsedLabelOf(title, count, measureOf);

      expect(label).toBe(expected);
    });
  });

  describe('GIVEN a title measuring exactly 116 px', () => {
    it('WHEN the label is built THEN the title is kept', () => {
      const label = collapsedLabelOf('apps', 2, () => 116);

      expect(label).toBe('apps\n2 packages');
    });
  });

  describe('GIVEN a 25-char title', () => {
    it('WHEN the label is built THEN the longest prefix that fits with an ellipsis is used', () => {
      const label = collapsedLabelOf('packages/long-folder-name', 3, measureOf);

      expect(label).toBe('packages/long-f…\n3 packages');
    });
  });

  describe('GIVEN a title of 20 emoji', () => {
    it('WHEN the label is built THEN it is cut by code point, not into a surrogate', () => {
      const label = collapsedLabelOf('😀'.repeat(20), 3, measureOf);
      const [firstLine = ''] = label.split('\n');
      const characters = [...firstLine];

      expect(firstLine).toBe(`${'😀'.repeat(7)}…`);
      expect(characters).toHaveLength(8);
    });
  });

  describe('GIVEN nothing fits', () => {
    it('WHEN the label is built THEN the title is only an ellipsis', () => {
      const label = collapsedLabelOf('apps', 3, () => 1000);

      expect(label).toBe('…\n3 packages');
    });
  });
});
