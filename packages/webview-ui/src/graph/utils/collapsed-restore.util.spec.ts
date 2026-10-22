import { describe, expect, it } from 'vitest';

import { collapsedOf } from './collapsed-restore.util.ts';

describe('FEATURE: collapsedOf', () => {
  describe('GIVEN the folders the drawn graph has', () => {
    const known = new Set(['a', 'b', '__proto__']);

    it('WHEN the saved list has a gone folder, a repeat and __proto__ THEN only the known folders stay', () => {
      const collapsed = collapsedOf(['a', 'gone', '__proto__', 'a'], known);

      expect(collapsed).toStrictEqual(new Set(['a', '__proto__']));
    });

    it('WHEN the saved list is empty THEN nothing is collapsed', () => {
      const collapsed = collapsedOf([], known);

      expect(collapsed).toStrictEqual(new Set());
    });
  });
});
