import { realpath, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { isMissing } from '../../shared/errors/utils/errno.util.ts';
import { isWithin } from '../../shared/fs/utils/path-within.util.ts';
import { turboBinaryCandidates } from '../../shared/turbo/utils/turbo-platform.util.ts';

/** The `node_modules` dirs Node would search from `realManifest`, kept only inside `boundary`; reads nothing from disk. */
const lookupDirs = (realManifest: string, boundary: string): string[] => {
  const fromManifest = createRequire(realManifest);
  const paths = fromManifest.resolve.paths('turbo');
  const dirs = paths ?? [];

  return dirs.filter((dir) => isWithin(boundary, dir));
};

/** The real path of `path` when it is a regular file that really lies inside `boundary`; `null` when missing or anything else. */
const realFileWithin = async (path: string, boundary: string): Promise<string | null> => {
  try {
    const stats = await stat(path);
    const isFile = stats.isFile();

    if (!isFile) return null;

    const real = await realpath(path);
    const isInside = isWithin(boundary, real);

    return isInside ? real : null;
  } catch (error) {
    const isAbsent = isMissing(error);

    if (isAbsent) return null;

    throw error;
  }
};

/**
 * The real path of the first turbo platform binary, in the launcher's candidate order, found in a dir Node would
 * search from `realManifest` (turbo's real `package.json`) that lies inside `boundary`, and whose own real path lies
 * there too, so a symlink out of `boundary` is skipped; `null` when there is none. Checked with `stat`, never
 * `require.resolve`, which reads each package's `package.json` synchronously and follows its `main`/`exports`. A
 * `stat` error other than a missing path carries that path.
 */
export const platformBinary = async (realManifest: string, boundary: string): Promise<string | null> => {
  const candidates = turboBinaryCandidates(process.platform, process.arch);
  const dirs = lookupDirs(realManifest, boundary);
  const files = candidates.flatMap((candidate) => dirs.map((dir) => join(dir, candidate)));

  for (const file of files) {
    const found = await realFileWithin(file, boundary);

    if (found !== null) return found;
  }

  return null;
};
