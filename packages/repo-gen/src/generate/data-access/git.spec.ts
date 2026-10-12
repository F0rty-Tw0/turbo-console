import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pathExists } from './fixture-files.ts';
import { git } from './git.ts';

const HOOK_NAMES = ['pre-commit', 'commit-msg', 'post-commit'];

/** The loose-objects task packs once 100 objects are loose, and runs under `gc.auto=0` too. */
const MAINTENANCE_CONFIG = '[maintenance]\n\tautoDetach = false\n[maintenance "loose-objects"]\n\tenabled = true\n';

const posixPath = (path: string): string => path.replaceAll('\\', '/');

describe('FEATURE: git runner', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'repo-gen-git-'));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN an empty dir', () => {
    it('WHEN init runs with -b main THEN the unborn branch is main', async () => {
      await git(dir, ['init', '-b', 'main']);

      const branch = await git(dir, ['symbolic-ref', '--short', 'HEAD']);

      expect(branch).toBe('main\n');
    });

    it('WHEN the identity is read THEN the fixture identity from the -c flags comes back', async () => {
      const name = await git(dir, ['config', 'user.name']);
      const email = await git(dir, ['config', 'user.email']);

      expect([name, email]).toStrictEqual(['fixture\n', 'fixture@invalid\n']);
    });

    it('WHEN auto gc and maintenance settings are read THEN both are off', async () => {
      const gcAuto = await git(dir, ['config', 'gc.auto']);
      const maintenanceAuto = await git(dir, ['config', 'maintenance.auto']);

      expect([gcAuto, maintenanceAuto]).toStrictEqual(['0\n', 'false\n']);
    });

    it('WHEN git fails THEN the promise rejects', async () => {
      const log = git(dir, ['log']);

      await expect(log).rejects.toThrow();
    });
  });

  describe('GIVEN GIT_DIR in the environment points at another repo', () => {
    it('WHEN init runs in a dir THEN that dir gets its own .git', async () => {
      const other = join(dir, 'other');
      const target = join(dir, 'target');

      await mkdir(other);
      await mkdir(target);
      await git(other, ['init', '--quiet', '-b', 'main']);
      vi.stubEnv('GIT_DIR', join(other, '.git'));
      await git(target, ['init', '--quiet', '-b', 'main']);
      const gitDir = await git(target, ['rev-parse', '--absolute-git-dir']);
      const realTarget = await realpath(target);

      expect(resolve(gitDir.trim())).toBe(join(realTarget, '.git'));
    });
  });

  describe('GIVEN a global git config whose auto maintenance packs loose objects in the foreground', () => {
    beforeEach(async () => {
      const home = join(dir, 'home');

      await mkdir(home);
      await writeFile(join(home, '.gitconfig'), MAINTENANCE_CONFIG);
      vi.stubEnv('HOME', home);
      vi.stubEnv('XDG_CONFIG_HOME', join(home, '.config'));
    });

    it('WHEN 150 files are committed THEN every object stays loose', async () => {
      const repo = join(dir, 'repo');

      await mkdir(repo);
      await git(repo, ['init', '--quiet', '-b', 'main']);

      for (let index = 0; index < 150; index += 1) await writeFile(join(repo, `file-${index}.txt`), `${index}\n`);

      await git(repo, ['add', '-A']);
      await git(repo, ['commit', '--quiet', '-m', 'commit']);
      const counts = await git(repo, ['count-objects', '-v']);

      expect(counts).toContain('in-pack: 0\n');
    });
  });

  describe('GIVEN a global git config whose hooksPath holds commit hooks', () => {
    const marker = (): string => join(dir, 'hook-ran');

    beforeEach(async () => {
      const home = join(dir, 'home');
      const hooks = join(dir, 'hooks');
      const script = `#!/bin/sh\necho ran >> "${posixPath(marker())}"\n`;

      await mkdir(home);
      await mkdir(hooks);
      await writeFile(join(home, '.gitconfig'), `[core]\n\thooksPath = ${posixPath(hooks)}\n`);

      for (const name of HOOK_NAMES) await writeFile(join(hooks, name), script, { mode: 0o755 });

      vi.stubEnv('HOME', home);
      vi.stubEnv('XDG_CONFIG_HOME', join(home, '.config'));
    });

    it('WHEN the global config is read THEN it names the hooks dir', async () => {
      const hooksPath = await git(dir, ['config', '--global', 'core.hooksPath']);

      expect(hooksPath).toBe(`${posixPath(join(dir, 'hooks'))}\n`);
    });

    it('WHEN a commit runs THEN no hook runs', async () => {
      await git(dir, ['init', '--quiet', '-b', 'main']);
      await writeFile(join(dir, 'file.txt'), 'content\n');
      await git(dir, ['add', 'file.txt']);
      await git(dir, ['commit', '--quiet', '-m', 'commit']);

      const hookRan = await pathExists(marker());

      expect(hookRan).toBe(false);
    });
  });
});
