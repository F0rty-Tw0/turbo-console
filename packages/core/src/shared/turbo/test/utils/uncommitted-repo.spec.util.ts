import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import type { FixtureFile } from '@turbo-console/repo-gen';

const run = promisify(execFile);

const writeFixtureFile = async (dir: string, file: FixtureFile): Promise<void> => {
  const segments = file.path.split('/');
  const target = join(dir, ...segments);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.content);
};

/**
 * Writes `files` into `dir` and runs `git init` only: no `git add`, no commit, no identity. Promisified calls are not
 * seen by `recordingExecFile`, so spawn counts in contract specs stay clean. `dir` is a fresh `mkdtemp` dir the
 * caller removes.
 */
export const writeUncommittedRepo = async (dir: string, files: FixtureFile[]): Promise<void> => {
  for (const file of files) await writeFixtureFile(dir, file);

  await run('git', ['init', '--quiet', '-b', 'main'], { cwd: dir });
};
