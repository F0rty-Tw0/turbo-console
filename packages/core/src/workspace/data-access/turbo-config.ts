import { access } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { errnoCode, isMissing } from '../../shared/errors/utils/errno.util.ts';
import { ioMessage } from '../../shared/errors/utils/turbo-message.util.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import type { TurboConfigError, TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';
import { packageConfigDirs } from '../utils/config-dir.util.ts';
import { parseTurboConfig } from '../utils/turbo-config.util.ts';

const BOTH_WARNING = 'both turbo.json and turbo.jsonc found; read turbo.json';

const NOT_SMALL_FILE = 'not a regular file of at most 1 MiB';

/** Each read holds a file open, so a graph of thousands of packages cannot run out of descriptors (EMFILE). */
const MAX_CONCURRENT_READS = 16;

const comparePaths = (left: TurboConfigFile, right: TurboConfigFile): number =>
  Number(left.path > right.path) - Number(left.path < right.path);

/** `text` is `null` for a FIFO, a directory or a file over 1 MiB: an error entry, never a throw. */
const configOf = (path: string, text: string | null): TurboConfigFile => {
  if (text !== null) return parseTurboConfig(path, text);

  const config: TurboConfigError = { path, error: NOT_SMALL_FILE };

  return config;
};

/** A filesystem error naming `absolute`, as `io`. */
const ioError = (absolute: string, error: unknown): TurboException =>
  new TurboException('io', ioMessage(absolute, errnoCode(error)), { cause: error });

/** The text of `absolute`, `null` as `readSmallFile` gives it; `undefined` when it does not exist. Any other failure is `io`. */
const readText = async (absolute: string): Promise<string | null | undefined> => {
  try {
    return await readSmallFile(absolute);
  } catch (error) {
    const isAbsent = isMissing(error);

    if (isAbsent) return undefined;

    throw ioError(absolute, error);
  }
};

/** One config file, `path` posix relative to `root`; `null` when it does not exist. Any other read failure is `io` naming the absolute path. */
const readConfigFile = async (root: string, path: string): Promise<TurboConfigFile | null> => {
  const text = await readText(join(root, path));

  if (text === undefined) return null;

  return configOf(path, text);
};

/** Whether `path` exists, without reading it; a failure other than a missing path is `io`. */
const exists = async (root: string, path: string): Promise<boolean> => {
  const absolute = join(root, path);

  try {
    await access(absolute);

    return true;
  } catch (error) {
    const isAbsent = isMissing(error);

    if (isAbsent) return false;

    throw ioError(absolute, error);
  }
};

/**
 * `turbo.json`, else `turbo.jsonc`, of one posix relative directory (`''` = root); `null` when neither exists. A
 * `turbo.json` error entry (bad JSON, not a regular file of at most 1 MiB) is returned as it is, and `turbo.jsonc` is
 * not touched. A parsed `turbo.json` carries a warning when `turbo.jsonc` exists, which is checked but never read.
 */
export const readTurboConfig = async (root: string, dir: string): Promise<TurboConfigFile | null> => {
  const json = await readConfigFile(root, posix.join(dir, 'turbo.json'));
  const jsoncPath = posix.join(dir, 'turbo.jsonc');

  if (json === null) return readConfigFile(root, jsoncPath);

  if ('error' in json) return json;

  const isBoth = await exists(root, jsoncPath);

  if (!isBoth) return json;

  const withWarning: TurboConfigOk = { ...json, warning: BOTH_WARNING };

  return withWarning;
};

/** Aborts with `stop` or `signal`. Unread between two aborts, it keeps the first in array order, so read it before `stop`. */
const haltSignalOf = (stop: AbortController, signal: AbortSignal | undefined): AbortSignal => {
  const signals = [stop.signal];

  if (signal !== undefined) signals.push(signal);

  return AbortSignal.any(signals);
};

/**
 * The configs of `dirs`, at most `MAX_CONCURRENT_READS` read at a time, in no order; dirs with none left out. The first
 * read failure or `signal` abort stops each worker before its next dir and is the rejection; nothing later replaces it.
 */
const readEach = async (root: string, dirs: string[], signal: AbortSignal | undefined): Promise<TurboConfigFile[]> => {
  const stop = new AbortController();
  const halt = haltSignalOf(stop, signal);
  const cursor = dirs.values();
  const found: TurboConfigFile[] = [];

  const worker = async (): Promise<void> => {
    for (const dir of cursor) {
      try {
        halt.throwIfAborted();
        const config = await readTurboConfig(root, dir);

        if (config !== null) found.push(config);
      } catch (error) {
        if (!halt.aborted) stop.abort(error);

        return;
      }
    }
  };

  const workers = Array.from({ length: MAX_CONCURRENT_READS }, worker);

  await Promise.all(workers);
  halt.throwIfAborted();

  return found;
};

/**
 * The root's config and each of `dirs`' (posix, relative to `root`, as `packageConfigDirs` keeps them), sorted by path;
 * directories with none are left out, and the root is read once. Rejects with the first read failure, or with
 * `signal`'s reason when it aborts first.
 */
export const readTurboConfigs = async (root: string, dirs: string[], signal?: AbortSignal | undefined): Promise<TurboConfigFile[]> => {
  const packageDirs = packageConfigDirs(dirs);
  const allDirs = ['', ...packageDirs];
  const found = await readEach(root, allDirs, signal);

  return found.toSorted(comparePaths);
};
