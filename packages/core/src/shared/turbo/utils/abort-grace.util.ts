import { MemoryLimitError } from '../common/memory-limit.exception.ts';

/**
 * Wait for exit after the abort kill. A runaway turbo gets SIGKILL at once on POSIX, since `graceMs` of runaway
 * allocation is several more GB. On Windows `killTree` starts `taskkill /T /F` asynchronously, and a grace of 0
 * would `child.kill()` before taskkill walks the tree, leaving turbo's children running; `/F` is already forceful.
 */
export const abortGraceMs = (reason: unknown, platform: NodeJS.Platform, graceMs: number): number => {
  const killAtOnce = reason instanceof MemoryLimitError && platform !== 'win32';

  return killAtOnce ? 0 : graceMs;
};
