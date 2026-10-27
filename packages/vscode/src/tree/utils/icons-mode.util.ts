import type { IconsMode, IconsSetting } from '../common/tree-row.type.ts';

/** The `turboConsole.icons` setting: a user can type any JSON there, and anything but a known value is `auto`. */
export const iconsSettingOf = (value: unknown): IconsSetting => {
  if (value === 'theme' || value === 'builtin') return value;

  return 'auto';
};

/**
 * The drawing mode for a setting. `auto` follows the file icon theme: Seti, VS Code's default, has no folder icons, so
 * those rows would show none. `themeHasFolders` is `null` while unknown, and `auto` draws Turbo Console's own then.
 */
export const iconModeOf = (setting: IconsSetting, themeHasFolders: boolean | null): IconsMode => {
  if (setting !== 'auto') return setting;

  if (themeHasFolders === true) return 'theme';

  return 'builtin';
};
