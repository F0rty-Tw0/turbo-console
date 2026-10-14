import type { Dirent } from 'node:fs';
import { readdir, utimes } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const GIT_DIR = '.git';

/**
 * Copy of core's test-only `backdateTree`: sets the access and modification times of every file under `dir`, `.git`
 * excepted, to `ageMs` before now, so a following load sees no keyed file written during its spawn.
 */
export const backdateTree = async (dir: string, ageMs: number): Promise<void> => {
  const time = new Date(Date.now() - ageMs);
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  const isTreeFile = (entry: Dirent): boolean => {
    const path = relative(dir, entry.parentPath);
    const isInGit = path.startsWith(`${GIT_DIR}${sep}`);
    const isGit = path === GIT_DIR || isInGit;
    const isFile = entry.isFile();

    return isFile && !isGit;
  };

  const backdate = async (entry: Dirent): Promise<void> => utimes(join(entry.parentPath, entry.name), time, time);
  const files = entries.filter(isTreeFile);

  await Promise.all(files.map(backdate));
};
