import { appendFile } from 'node:fs/promises';
import { basename } from 'node:path';

/**
 * A read hook that appends `bytes` to the file named `name` before its first read only, as a writer still appending
 * during the hash would.
 */
export const growOnce = (name: string, bytes: number): ((path: string) => Promise<void>) => {
  const growth = { isDone: false };

  return async (path: string): Promise<void> => {
    const fileName = basename(path);
    const isTarget = fileName === name;

    if (!isTarget || growth.isDone) return;

    growth.isDone = true;
    await appendFile(path, Buffer.alloc(bytes, 'g'));
  };
};
