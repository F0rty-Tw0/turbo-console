import { execFile } from 'node:child_process';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTempDir } from './fixture-files.ts';
import { stubTempDir } from '../test/utils/temp-env.spec.util.ts';

const IS_WINDOWS = process.platform === 'win32';

const run = promisify(execFile);

/** The 8.3 short form of `dir`, as cmd's `%~s` expands it; the same long path back when the volume has no short names. */
const shortPathOf = async (dir: string): Promise<string> => {
  const { stdout } = await run('cmd.exe', ['/d', '/c', `for %I in ("${dir}") do @echo %~sI`], { windowsVerbatimArguments: true });

  return stdout.trim();
};

// CI's temp dir sits on D:, which has no short names, so this case keeps the RUNNER~1 path that users' %TEMP% often has under test.
describe.skipIf(!IS_WINDOWS)('FEATURE: temp dirs under a Windows 8.3 short path', () => {
  let longRoot = '';
  let shortRoot = '';

  beforeEach(async () => {
    longRoot = await realpath(await mkdtemp(join(homedir(), 'repo-gen-short-name-')));
    shortRoot = await shortPathOf(longRoot);
    stubTempDir(shortRoot);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(longRoot, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN the OS temp dir is set to its short form', () => {
    it('WHEN a temp dir is created THEN its path is the long form', async () => {
      const dir = await createTempDir('repo-gen-created-');

      expect(shortRoot).not.toBe(longRoot);
      expect(dir.startsWith(join(longRoot, 'repo-gen-created-'))).toBe(true);
    });
  });
});
