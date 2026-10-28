import type { IconThemeFacts } from './icon-theme.type.ts';

/** An icon theme file bigger than this is not read: a theme JSON is a few dozen KB, and the file is user-installed input. */
export const ICON_THEME_BYTES_MAX = 8 * 1024 * 1024;

/**
 * The scheme of the name-only uri a tool row gives VS Code to pick a file icon: the theme looks at the basename alone, so a
 * scheme of ours keeps the uri off real files and their git and problem decorations.
 */
export const THEME_ICON_SCHEME = 'turbo-console-icon';

/** One shared empty set, so "no names" is the same instance every time and the tree's redraw rule can compare by identity. */
export const NO_FILE_NAMES: ReadonlySet<string> = new Set();

export const UNKNOWN_FACTS: IconThemeFacts = { folders: null, fileNames: NO_FILE_NAMES };
