import { posix } from 'node:path';

import { normalDir } from '../../shared/turbo/utils/posix-path.util.ts';

const WINDOWS_DRIVE = /^[a-z]:/i;

/** A normalized dir that is not the root (`.`, read on its own), not absolute (`/abs`, `C:/x`) and not above the root (`..`, `../x`). */
const isPackageDir = (dir: string): boolean => {
  const isRoot = dir === '.';
  const isAbsolute = posix.isAbsolute(dir) || WINDOWS_DRIVE.test(dir);
  const isEscaping = dir === '..' || dir.startsWith('../');

  return !isRoot && !isAbsolute && !isEscaping;
};

/**
 * The package dirs (posix, relative to the root) whose `turbo.json(c)` is read: each normalized by `normalDir`, the
 * root, absolute dirs and dirs above the root dropped, duplicates removed. So nothing outside the root is read, whatever
 * turbo reports; turbo 2.11.7 itself was seen to refuse only a package dir symlinked outside the root (`Workspace
 * package resolves outside repository root`).
 */
export const packageConfigDirs = (dirs: string[]): string[] => {
  const kept = dirs.map(normalDir).filter(isPackageDir);
  const unique = new Set(kept);

  return [...unique];
};
