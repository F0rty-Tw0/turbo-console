import { access, appendFile, cp, lstat, mkdir, mkdtemp, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { FixtureFile } from '../common/fixture.type.ts';

/** Permission bits for anyone but the owner. */
const GROUP_OTHER_BITS = 0o077;

/** Writes each file under `dir`, creating parent dirs; `file.path` is posix-relative. */
export const writeFiles = async (dir: string, files: FixtureFile[]): Promise<void> => {
  for (const file of files) {
    const path = join(dir, file.path);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content);
  }
};

/** Appends `content` to each path; rejects before touching any file when one path does not exist. */
export const appendToFiles = async (dir: string, paths: string[], content: string): Promise<void> => {
  for (const path of paths) await access(join(dir, path));

  for (const path of paths) await appendFile(join(dir, path), content);
};

/** Copies a whole fixture repo, `.git` included. */
export const copyFixture = async (from: string, to: string): Promise<void> => {
  await cp(from, to, { recursive: true });
};

/** A fresh dir under the OS temp dir, resolved past links and Windows 8.3 short names so it matches the paths git prints. */
export const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), prefix));

  return realpath(dir);
};

/** Throws unless `dir` is a real directory (not a link) owned by `uid` with no group or other permission bits. */
const assertPrivateDir = async (dir: string, uid: number): Promise<void> => {
  const stats = await lstat(dir);
  const isRealDirectory = stats.isDirectory();
  const isPrivate = isRealDirectory && stats.uid === uid && (stats.mode & GROUP_OTHER_BITS) === 0;

  if (!isPrivate) throw new Error(`${dir} is not private: it must be a directory owned by uid ${uid} with mode 0700`);
};

/**
 * `<os temp>/<name>-<uid>`, created with mode 0700, resolved like `createTempDir`. On POSIX a pre-existing dir is refused
 * unless it is private, so another user cannot plant or read fixtures; Windows has no uid and a per-user temp dir, so the suffix is `user`.
 */
export const privateTempDir = async (name: string): Promise<string> => {
  const uid = process.getuid?.();
  const dir = join(tmpdir(), `${name}-${uid ?? 'user'}`);

  await mkdir(dir, { recursive: true, mode: 0o700 });

  if (uid !== undefined) await assertPrivateDir(dir, uid);

  return realpath(dir);
};

/** Rejects when `to` exists and is not empty (`ENOTEMPTY`/`EEXIST`, `EPERM` on Windows). */
export const renameDir = async (from: string, to: string): Promise<void> => {
  await rename(from, to);
};

/** Retries `EBUSY`/`EPERM`/`ENOTEMPTY`: on Windows, git and virus scanners hold fresh files open briefly. */
export const removeDir = async (dir: string): Promise<void> => {
  await rm(dir, { recursive: true, force: true, maxRetries: 5 });
};

export const pathExists = async (path: string): Promise<boolean> => {
  const stats = await stat(path).catch(() => undefined);

  return stats !== undefined;
};

/** True when `dir` is absent or has no entries, dotfiles included. */
export const isEmptyDir = async (dir: string): Promise<boolean> => {
  const isPresent = await pathExists(dir);

  if (!isPresent) return true;

  const entries = await readdir(dir);

  return entries.length === 0;
};
