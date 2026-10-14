import type { InspectedSetting, SettingLevel } from '../common/setting.type.ts';

/**
 * The workspace level when it sets the value now, else the user's settings: a toggle that wrote the user level under
 * a workspace value would change nothing the user can see. No folder level: `treeMode` is window-scoped and is read
 * without a resource, so a folder value never shows up, and writing one without a resource throws.
 */
export const settingLevelOf = (inspected: InspectedSetting | undefined): SettingLevel => {
  if (inspected?.workspaceValue !== undefined) return 'workspace';

  return 'global';
};
