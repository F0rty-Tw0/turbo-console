import type { IconsMode } from '../common/tree-row.type.ts';

/**
 * The `turboConsole.icons` setting as a mode: a user can type any JSON there, and anything but `theme` is `builtin`.
 * `theme` is opt-in because VS Code's default icon theme, Seti, has no folder icons: those rows would show none.
 */
export const iconsModeOf = (value: unknown): IconsMode => {
  if (value === 'theme') return 'theme';

  return 'builtin';
};
