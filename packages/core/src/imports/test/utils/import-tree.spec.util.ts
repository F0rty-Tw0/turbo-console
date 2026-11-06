import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Creates `files` under `root`: each key is a posix path relative to `root`; a key ending in `/` makes an empty dir. */
export const writeImportTree = async (root: string, files: Readonly<Record<string, string>>): Promise<void> => {
  for (const [name, text] of Object.entries(files)) {
    const path = join(root, name);
    const isDir = name.endsWith('/');
    const fileDir = dirname(path);
    const parent = isDir ? path : fileDir;

    await mkdir(parent, { recursive: true });

    if (!isDir) await writeFile(path, text);
  }
};
