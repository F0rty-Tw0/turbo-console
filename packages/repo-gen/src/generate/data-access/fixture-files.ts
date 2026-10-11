import { appendFile, cp, mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { FixtureFile } from '../common/fixture.type.ts';

/** Writes each file under `dir`, creating parent dirs; `file.path` is posix-relative. */
export const writeFiles = async (dir: string, files: FixtureFile[]): Promise<void> => {
  for (const file of files) {
    const path = join(dir, file.path);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content);
  }
};

export const appendToFiles = async (dir: string, paths: string[], content: string): Promise<void> => {
  for (const path of paths) await appendFile(join(dir, path), content);
};

/** Copies a whole fixture repo, `.git` included. */
export const copyFixture = async (from: string, to: string): Promise<void> => {
  await cp(from, to, { recursive: true });
};

export const createTempDir = async (prefix: string): Promise<string> => {
  return mkdtemp(join(tmpdir(), prefix));
};

export const tempPath = (...segments: string[]): string => join(tmpdir(), ...segments);

/** Rejects when `to` exists and is not empty (`ENOTEMPTY`/`EEXIST`, `EPERM` on Windows). */
export const renameDir = async (from: string, to: string): Promise<void> => {
  await rename(from, to);
};

export const removeDir = async (dir: string): Promise<void> => {
  await rm(dir, { recursive: true, force: true });
};

export const pathExists = async (path: string): Promise<boolean> => {
  const stats = await stat(path).catch(() => undefined);

  return stats !== undefined;
};
