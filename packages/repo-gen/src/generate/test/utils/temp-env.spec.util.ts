import { vi } from 'vitest';

/** Points `os.tmpdir()` at `dir` on every platform: POSIX reads TMPDIR, Windows reads TEMP, then TMP. */
export const stubTempDir = (dir: string): void => {
  vi.stubEnv('TMPDIR', dir);
  vi.stubEnv('TEMP', dir);
  vi.stubEnv('TMP', dir);
};
