import { describe, expect, it } from 'vitest';

import { treeModeOf } from './tree-mode.util.ts';

describe('FEATURE: tree mode setting', () => {
  describe('GIVEN a setting value', () => {
    it('WHEN it is list THEN the mode is list', () => {
      const mode = treeModeOf('list');

      expect(mode).toBe('list');
    });

    it('WHEN it is folders THEN the mode is folders', () => {
      const mode = treeModeOf('folders');

      expect(mode).toBe('folders');
    });

    it('WHEN it is anything else THEN the mode is the folders default', () => {
      const mode = treeModeOf(42);

      expect(mode).toBe('folders');
    });
  });
});
