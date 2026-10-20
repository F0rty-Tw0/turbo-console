import type { IconsMode } from '../common/tree-row.type.ts';

/** The `turboConsole.icons` setting as a mode: a user can type any JSON there, and anything but `builtin` is `theme`. */
export const iconsModeOf = (value: unknown): IconsMode => {
  if (value === 'builtin') return 'builtin';

  return 'theme';
};
