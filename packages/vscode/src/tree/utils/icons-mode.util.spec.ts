import { describe, expect, it } from 'vitest';

import { iconsModeOf } from './icons-mode.util.ts';

describe('FEATURE: icons setting', () => {
  describe('GIVEN a setting value', () => {
    it('WHEN it is builtin THEN the mode is builtin', () => {
      const mode = iconsModeOf('builtin');

      expect(mode).toBe('builtin');
    });

    it('WHEN it is theme THEN the mode is theme', () => {
      const mode = iconsModeOf('theme');

      expect(mode).toBe('theme');
    });

    it.each([undefined, 'x', 3])('WHEN it is %s THEN the mode is the builtin default', (value) => {
      const mode = iconsModeOf(value);

      expect(mode).toBe('builtin');
    });
  });
});
