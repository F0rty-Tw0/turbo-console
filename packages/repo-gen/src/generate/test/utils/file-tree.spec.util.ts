import type { Dirent } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const isOutsideGit = (path: string): boolean => path !== '.git' && !path.startsWith('.git/');

/** Every file under `dir` except `.git/`, as sorted `[posix path, content]` rows. */
export const fileTree = async (dir: string): Promise<[string, string][]> => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  const relativePath = (entry: Dirent): string => {
    const path = relative(dir, join(entry.parentPath, entry.name));

    return path.replaceAll('\\', '/');
  };

  const paths = entries.filter((entry) => entry.isFile()).map(relativePath);
  const kept = paths.filter(isOutsideGit).toSorted();
  const rows: [string, string][] = [];

  for (const path of kept) rows.push([path, await readFile(join(dir, path), 'utf8')]);

  return rows;
};
