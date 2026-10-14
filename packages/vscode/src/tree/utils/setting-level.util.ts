import type { InspectedSetting, SettingLevel } from '../common/setting.type.ts';

/**
 * The most specific level that sets the value now, else the user's settings: a toggle that wrote the user level under
 * a workspace value would change nothing the user can see.
 */
export const settingLevelOf = (inspected: InspectedSetting | undefined): SettingLevel => {
  if (inspected?.workspaceFolderValue !== undefined) return 'workspaceFolder';

  if (inspected?.workspaceValue !== undefined) return 'workspace';

  return 'global';
};
