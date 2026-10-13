import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';

import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { errnoCode, isMissing } from '../../shared/errors/utils/errno.util.ts';
import { failedMessage, ioMessage } from '../../shared/errors/utils/turbo-message.util.ts';
import { TURBO_BUDGET_MS } from '../../shared/turbo/common/turbo-budget.const.ts';
import { runTurbo } from '../../shared/turbo/data-access/run-turbo.ts';

/**
 * `--version` per override file state: path, device, inode, mtime, ctime and size. ctime is in the key because
 * `utimes` cannot set it: a same-size rewrite with its mtime restored still misses. A rejected spawn is dropped so the
 * next call retries.
 */
const versions = new Map<string, Promise<string>>();

/** A missing override (`ENOENT`, or `ENOTDIR` for a path through a file) is `not-found`, not `io`: the caller named a binary that is not there. */
const statOverride = async (path: string): Promise<Stats> => {
  try {
    return await stat(path);
  } catch (error) {
    const isAbsent = isMissing(error);

    if (isAbsent) throw new TurboException('not-found', `turbo override not found: ${ioMessage(path, errnoCode(error))}`, { cause: error });

    throw error;
  }
};

const spawnVersion = async (path: string, root: string, signal: AbortSignal | undefined): Promise<string> => {
  const options = { timeoutMs: TURBO_BUDGET_MS.version, signal };
  const result = await runTurbo(path, ['--version'], root, options);

  if (result.exitCode !== 0) throw new TurboException('failed', failedMessage('--version', result.exitCode, result.stderr));

  return result.stdout.trim();
};

/**
 * The override binary's `--version` stdout, trimmed. Spawned once (in `root`, within the version budget) per file
 * state (see `versions`), so a replaced or rewritten binary is asked again. Concurrent callers share one spawn, and
 * with it the first caller's `signal`. Throws `not-found` when `path` is missing and `failed` when `--version` exits
 * non-zero; any other error is left to the caller to convert.
 */
export const overrideVersion = async (path: string, root: string, signal?: AbortSignal): Promise<string> => {
  const stats = await statOverride(path);
  const key = `${path}\0${stats.dev}\0${stats.ino}\0${stats.mtimeMs}\0${stats.ctimeMs}\0${stats.size}`;
  const cached = versions.get(key);

  if (cached !== undefined) return cached;

  const pending = spawnVersion(path, root, signal);

  const forget = (): void => {
    versions.delete(key);
  };

  versions.set(key, pending);
  pending.catch(forget);

  return pending;
};
