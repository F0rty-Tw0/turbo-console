import { describe, expect, it } from 'vitest';

import { iconModeOf, iconsSettingOf } from './icons-mode.util.ts';

describe('FEATURE: icons setting', () => {
  describe('GIVEN a setting value', () => {
    it.each(['auto', 'theme', 'builtin'] as const)('WHEN it is %s THEN the setting is that value', (value) => {
      const setting = iconsSettingOf(value);

      expect(setting).toBe(value);
    });

    it.each([undefined, 7, 'Theme', 'nope'])('WHEN it is %j THEN the setting reads auto', (value) => {
      const setting = iconsSettingOf(value);

      expect(setting).toBe('auto');
    });
  });

  describe('GIVEN a setting and whether the icon theme has folder icons', () => {
    it.each([
      ['auto', true, 'theme'],
      ['auto', false, 'builtin'],
      ['auto', null, 'builtin'],
      ['theme', true, 'theme'],
      ['theme', false, 'theme'],
      ['theme', null, 'theme'],
      ['builtin', true, 'builtin'],
      ['builtin', false, 'builtin'],
      ['builtin', null, 'builtin']
    ] as const)('WHEN the setting is %s and theme folders are %s THEN the mode is %s', (setting, folders, expected) => {
      const mode = iconModeOf(setting, folders);

      expect(mode).toBe(expected);
    });
  });
});
