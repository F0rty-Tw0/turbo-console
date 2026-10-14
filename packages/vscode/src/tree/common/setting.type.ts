/** Where a setting toggle writes: the user's settings or the workspace's. */
export type SettingLevel = 'global' | 'workspace';

/** The per-level values of one setting, as `WorkspaceConfiguration.inspect` gives them. */
export type InspectedSetting = {
  readonly globalValue?: unknown;
  readonly workspaceValue?: unknown;
};
