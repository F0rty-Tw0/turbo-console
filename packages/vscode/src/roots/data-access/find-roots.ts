import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { RootFolder } from '../common/root.type.ts';
import { ROOT_MARKERS } from '../common/roots.const.ts';

const isRegularFile = async (path: string): Promise<boolean> => {
  try {
    const info = await stat(path);

    return info.isFile();
  } catch {
    return false;
  }
};

const hasMarker = async (folder: RootFolder): Promise<boolean> => {
  const paths = ROOT_MARKERS.map((marker) => join(folder.root, marker));
  const found = await Promise.all(paths.map(isRegularFile));

  return found.includes(true);
};

/** The folders whose own directory holds a regular `turbo.json` or `turbo.jsonc`, in input order; any error means no. */
export const findRoots = async (folders: RootFolder[]): Promise<RootFolder[]> => {
  const flags = await Promise.all(folders.map(hasMarker));

  return folders.filter((_folder, index) => flags[index] === true);
};
