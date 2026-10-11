import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { git } from './git.ts';

describe('FEATURE: git runner', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'repo-gen-git-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
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

    it('WHEN git fails THEN the promise rejects', async () => {
      const log = git(dir, ['log']);

      await expect(log).rejects.toThrow();
    });
  });
});
