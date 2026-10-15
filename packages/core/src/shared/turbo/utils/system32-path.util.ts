import { win32 } from 'node:path';

const DEFAULT_SYSTEM_ROOT = 'C:\\Windows';

/** By absolute path, so an exe earlier on `PATH` or in the cwd is never run; a relative `SystemRoot` is ignored. */
export const system32Path = (exe: string, systemRoot: string | undefined): string => {
  const isRootAbsolute = systemRoot !== undefined && win32.isAbsolute(systemRoot);
  const base = isRootAbsolute ? systemRoot : DEFAULT_SYSTEM_ROOT;

  return win32.join(base, 'System32', exe);
};
