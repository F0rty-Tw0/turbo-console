/** Where a setting toggle writes: the user's settings, the workspace's or one workspace folder's. */
export type SettingLevel = 'global' | 'workspace' | 'workspaceFolder';

/** The per-level values of one setting, as `WorkspaceConfiguration.inspect` gives them. */
export type InspectedSetting = {
  readonly globalValue?: unknown;
  readonly workspaceValue?: unknown;
  readonly workspaceFolderValue?: unknown;
};
