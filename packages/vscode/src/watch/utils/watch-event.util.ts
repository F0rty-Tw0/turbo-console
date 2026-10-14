const SEPARATOR = /[\\/]/;

const TRAILING_SEPARATORS = /\/+$/;

const IGNORED_SEGMENT = 'node_modules';

const toPosix = (path: string): string => path.replaceAll('\\', '/');

/** `fsPath` relative to `root` with `/` separators, `.` for the root itself, `null` outside it. */
export const toRelative = (root: string, fsPath: string): string | null => {
  const posixRoot = toPosix(root);
  const base = posixRoot.replace(TRAILING_SEPARATORS, '');
  const path = toPosix(fsPath);

  if (path === base) return '.';

  const prefix = `${base}/`;
  const isInside = path.startsWith(prefix);

  if (!isInside) return null;

  return path.slice(prefix.length);
};

/** Spec §4.3: a watcher event with a `node_modules` path segment is ignored, whichever separator it uses. */
export const isIgnoredPath = (relative: string): boolean => {
  const segments = relative.split(SEPARATOR);

  return segments.includes(IGNORED_SEGMENT);
};

/**
 * Spec §4.3 watcher 2: a delete counts when the deleted path is a package dir of the shown model or an ancestor of
 * one. VS Code reports a deleted folder as one event, so the `package.json` inside it never reaches watcher 1.
 */
export const isPackageDelete = (deleted: string, packagePaths: string[]): boolean => {
  const path = toPosix(deleted);
  const isIgnored = isIgnoredPath(path);

  if (path === '.' || isIgnored) return false;

  const prefix = `${path}/`;
  const isUnder = (packagePath: string): boolean => packagePath === path || packagePath.startsWith(prefix);

  return packagePaths.some(isUnder);
};
