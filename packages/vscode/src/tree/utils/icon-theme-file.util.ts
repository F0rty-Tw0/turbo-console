import { isAbsolute, relative, resolve, sep } from 'node:path';

import type { ThemeExtension } from '../common/icon-theme.type.ts';

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

const isInside = (folder: string, file: string): boolean => {
  const path = relative(folder, file);
  const isParent = path === '..' || path.startsWith(`..${sep}`);

  return !isParent && !isAbsolute(path);
};

/** The `contributes.iconThemes` of a `package.json`, which is outside input: every level is checked. */
const iconThemesOf = (packageJSON: unknown): unknown[] => {
  if (!isObject(packageJSON) || !('contributes' in packageJSON)) return [];

  const { contributes } = packageJSON;

  if (!isObject(contributes) || !('iconThemes' in contributes)) return [];

  const { iconThemes } = contributes;

  if (!Array.isArray(iconThemes)) return [];

  return iconThemes;
};

const pathOfTheme = (entry: unknown, themeId: string): string | null => {
  if (!isObject(entry) || !('id' in entry) || entry.id !== themeId) return null;

  if (!('path' in entry) || typeof entry.path !== 'string') return null;

  return entry.path;
};

const entryPathOf = (packageJSON: unknown, themeId: string): string | null => {
  const entries = iconThemesOf(packageJSON);

  for (const entry of entries) {
    const path = pathOfTheme(entry, themeId);

    if (path !== null) return path;
  }

  return null;
};

/** The absolute path of the theme file the extension contributes under `themeId`, or `null` when none does or it leaves the extension folder. */
export const themeFileOf = (extensions: ThemeExtension[], themeId: string): string | null => {
  for (const { extensionPath, packageJSON } of extensions) {
    const entry = entryPathOf(packageJSON, themeId);

    if (entry === null) continue;

    const file = resolve(extensionPath, entry);
    const isInExtension = isInside(extensionPath, file);

    if (isInExtension) return file;

    return null;
  }

  return null;
};

/** Whether a parsed icon theme file defines a `folder` icon. */
export const hasFolderKey = (parsed: unknown): boolean => isObject(parsed) && 'folder' in parsed;
