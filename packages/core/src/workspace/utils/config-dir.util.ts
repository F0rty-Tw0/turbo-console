import { posix } from 'node:path';

import { normalDir, toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';

const WINDOWS_DRIVE = /^[a-z]:/i;

/**
 * Whether `path`, relative to the root, stays inside it once `\` is read as `/` and the path normalized: not absolute
 * (`/abs`, `C:/x`, `\\server\share`) and not above the root (`..`, `../x`, `a/../../x`). The root itself (`.`) is inside.
 */
export const isInsideRoot = (path: string): boolean => {
  const posixPath = toPosixPath(path);
  const normal = normalDir(posixPath);
  const isAbsolute = posix.isAbsolute(normal) || WINDOWS_DRIVE.test(normal);
  const isEscaping = normal === '..' || normal.startsWith('../');

  return !isAbsolute && !isEscaping;
};

/** A normalized dir inside the root that is not the root itself (`.`, read on its own). */
const isPackageDir = (dir: string): boolean => {
  const isRoot = dir === '.';
  const isInside = isInsideRoot(dir);

  return !isRoot && isInside;
};

/**
 * The package dirs (posix, relative to the root) whose `turbo.json(c)` is read: each with `\` read as `/` and
 * normalized by `normalDir`, so the dir kept is the dir checked; the root, absolute dirs and dirs above the root
 * dropped, duplicates removed. So nothing outside the root is read, whatever turbo reports; turbo 2.11.7 itself was
 * seen to refuse only a package dir symlinked outside the root (`Workspace package resolves outside repository root`).
 */
export const packageConfigDirs = (dirs: string[]): string[] => {
  const kept = dirs.map(toPosixPath).map(normalDir).filter(isPackageDir);
  const unique = new Set(kept);

  return [...unique];
};
