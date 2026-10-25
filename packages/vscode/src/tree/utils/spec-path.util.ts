import { join, relative, win32 } from 'node:path';

const SEGMENT_SEPARATOR = /[/\\]/;

/** `win32.isAbsolute` also accepts every posix absolute path (`/etc/x`), so one check covers both platforms. */
const isAbsoluteAnywhere = (specPath: string): boolean => win32.isAbsolute(specPath);

const climbs = (specPath: string): boolean => specPath.split(SEGMENT_SEPARATOR).includes('..');

const isBelow = (packageDir: string, path: string): boolean => {
  const fromPackage = relative(packageDir, path);
  const isDir = fromPackage === '';

  return !isDir;
};

/**
 * The file `specPath` names inside `packageDir`, or `null` when it is absolute on either platform, has a `..` segment,
 * or resolves to the package directory itself (an empty or `.` path). The spec path comes from the
 * user's Atomizer config, so it is checked here before an editor opens it.
 */
export const specPathOf = (packageDir: string, specPath: string): string | null => {
  const isAbsolute = isAbsoluteAnywhere(specPath);
  const hasParent = climbs(specPath);

  if (isAbsolute || hasParent) return null;

  const path = join(packageDir, specPath);
  const isInside = isBelow(packageDir, path);

  if (!isInside) return null;

  return path;
};

/** The error text of a refused spec path. */
export const refusedSpecText = (specPath: string): string => `Refused to open "${specPath}": it leaves the package directory.`;

/** The error text of a spec file that is gone from disk, e.g. deleted since the last sync. */
export const missingSpecText = (path: string): string => `Spec file not found: ${path}`;
