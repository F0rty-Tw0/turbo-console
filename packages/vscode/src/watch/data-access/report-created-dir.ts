import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { isIgnoredPath, toRelative } from '../utils/watch-event.util.ts';

const hasPackageJson = async (dir: string): Promise<boolean> => {
  try {
    const info = await stat(join(dir, 'package.json'));

    return info.isFile();
  } catch {
    return false;
  }
};

/**
 * Spec §4.3 watcher 2: a created folder counts when it holds a `package.json` and sits inside `root` outside
 * `node_modules`. The OS watcher reports a folder moved or created whole as one event and never lists its contents.
 */
export const reportCreatedDir = async (root: string, fsPath: string, changed: () => void): Promise<void> => {
  const relative = toRelative(root, fsPath);

  if (relative === null) return;

  const isIgnored = isIgnoredPath(relative);

  if (isIgnored) return;

  const isPackage = await hasPackageJson(fsPath);

  if (isPackage) changed();
};
