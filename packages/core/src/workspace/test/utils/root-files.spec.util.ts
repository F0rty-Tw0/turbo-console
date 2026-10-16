import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** A new root under `parent` holding `files`, keyed by posix path relative to it, parent folders created. */
export const rootWithFiles = async (parent: string, files: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(join(parent, 'pm-'));
  const writeOne = async ([path, text]: [string, string]): Promise<void> => {
    const file = join(root, path);

    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
  };

  await Promise.all(Object.entries(files).map(writeOne));

  return root;
};
