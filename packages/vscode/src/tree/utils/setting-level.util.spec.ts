import { describe, expect, it } from 'vitest';

import { settingLevelOf } from './setting-level.util.ts';

describe('FEATURE: level a setting toggle writes to', () => {
  describe('GIVEN the levels that set the value now', () => {
    it('WHEN a workspace folder sets it THEN the folder level is written', () => {
      const level = settingLevelOf({ workspaceFolderValue: 'list', workspaceValue: 'folders' });

      expect(level).toBe('workspaceFolder');
    });

    it('WHEN only the workspace sets it THEN the workspace level is written', () => {
      const level = settingLevelOf({ workspaceValue: 'list' });

      expect(level).toBe('workspace');
    });

    it('WHEN only the user sets it THEN the user level is written', () => {
      const level = settingLevelOf({ globalValue: 'list' });

      expect(level).toBe('global');
    });

    it('WHEN no level sets it THEN the user level is written', () => {
      const level = settingLevelOf({});

      expect(level).toBe('global');
    });

    it('WHEN the setting is unknown THEN the user level is written', () => {
      const level = settingLevelOf(undefined);

      expect(level).toBe('global');
    });
  });
});
