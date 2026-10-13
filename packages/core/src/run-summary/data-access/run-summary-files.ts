import type { Dirent } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { isWithin } from '../../binary/utils/path-within.util.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { errnoCode, isMissing } from '../../shared/errors/utils/errno.util.ts';
import { ioMessage } from '../../shared/errors/utils/turbo-message.util.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import { runSummarySchema } from '../../shared/turbo/common/run-summary.schema.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { MAX_SUMMARY_BYTES } from '../common/run-summary.const.ts';

const runsDirOf = (root: string): string => join(root, '.turbo', 'runs');

/** A regular file, not a symlink, FIFO or directory, named `*.json`. */
const isJsonFile = (entry: Dirent): boolean => entry.isFile() && entry.name.endsWith('.json');

const isListed = (file: RunSummaryFile | null): file is RunSummaryFile => file !== null;

const ioError = (path: string, error: unknown): TurboException => new TurboException('io', ioMessage(path, errnoCode(error)), { cause: error });

/**
 * `path`'s real path; `null` when it or a parent does not exist or is not a directory (ENOENT, ENOTDIR). Any other
 * failure is `io` naming `path`.
 */
const realPathOf = async (path: string): Promise<string | null> => {
  try {
    return await realpath(path);
  } catch (error) {
    const isGone = isMissing(error);

    if (isGone) return null;

    throw ioError(path, error);
  }
};

/**
 * `<root>/.turbo/runs`; `null` when it does not exist, a path part is not a directory, or it resolves outside `root`
 * through a symlink.
 */
const ownRunsDir = async (root: string): Promise<string | null> => {
  const dir = runsDirOf(root);
  const realDir = await realPathOf(dir);

  if (realDir === null) return null;

  const realRoot = await realPathOf(root);

  if (realRoot === null) return null;

  const isInside = isWithin(realRoot, realDir);

  return isInside ? dir : null;
};

/**
 * The entries of `dir`; `null` when it is gone or not a directory (ENOENT, ENOTDIR). Any other failure is `io` naming
 * `dir`.
 */
const readEntries = async (dir: string): Promise<Dirent[] | null> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    const isGone = isMissing(error);

    if (isGone) return null;

    throw ioError(dir, error);
  }
};

/** `name`'s mtime; `null` when it vanished since the listing (ENOENT). Any other stat failure is `io` naming the file. */
const statFile = async (dir: string, name: string): Promise<RunSummaryFile | null> => {
  const path = join(dir, name);

  try {
    const stats = await stat(path);
    const file: RunSummaryFile = { name, mtimeMs: stats.mtimeMs };

    return file;
  } catch (error) {
    const code = errnoCode(error);

    if (code === 'ENOENT') return null;

    throw ioError(path, error);
  }
};

/**
 * The regular `*.json` files of `<root>/.turbo/runs` with their mtimes, in no order; symlinks are left out. `null` when
 * the directory does not exist, a path part is not a directory, or it resolves outside `root`. Any other realpath or
 * readdir failure, and a stat failure other than ENOENT, is `io`.
 */
export const listRunSummaryFiles = async (root: string): Promise<RunSummaryFile[] | null> => {
  const dir = await ownRunsDir(root);

  if (dir === null) return null;

  const entries = await readEntries(dir);

  if (entries === null) return null;

  const names = entries.filter(isJsonFile).map((entry) => entry.name);
  const statted = names.map(async (name) => statFile(dir, name));
  const files = await Promise.all(statted);

  return files.filter(isListed);
};

/**
 * `<root>/.turbo/runs/<name>` parsed with `runSummarySchema`; `null` when it cannot be read, is not a regular file of at
 * most `MAX_SUMMARY_BYTES`, is not JSON or breaks the schema.
 */
export const readRunSummaryFile = async (root: string, name: string): Promise<RunSummary | null> => {
  try {
    const text = await readSmallFile(join(runsDirOf(root), name), MAX_SUMMARY_BYTES);

    if (text === null) return null;

    const json: unknown = JSON.parse(text);
    const parsed = runSummarySchema.safeParse(json);

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
