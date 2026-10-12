import { access, constants, stat } from 'node:fs/promises';

const notADirectory = (cwd: string): Error => {
  const fields = { code: 'ENOTDIR', syscall: 'stat', path: cwd };

  return Object.assign(new Error(`ENOTDIR: not a directory, stat '${cwd}'`), fields);
};

const assertSearchableDirectory = async (cwd: string): Promise<void> => {
  const stats = await stat(cwd);
  const isDirectory = stats.isDirectory();

  if (!isDirectory) throw notADirectory(cwd);

  await access(cwd, constants.X_OK);
};

/**
 * Rejects with an errno error whose `path` is `cwd` when `cwd` is missing (ENOENT), not a directory (ENOTDIR) or not
 * searchable (EACCES); the spawn would report each of these on the binary path instead. Resolves when `signal` has
 * aborted by the time the check fails, so the caller's abort check wins over the cwd's error.
 */
export const checkCwd = async (cwd: string, signal: AbortSignal): Promise<void> => {
  try {
    await assertSearchableDirectory(cwd);
  } catch (error) {
    if (!signal.aborted) throw error;
  }
};
