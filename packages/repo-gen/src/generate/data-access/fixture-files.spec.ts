import { chmod, mkdir, mkdtemp, readFile, realpath, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendToFiles,
  copyFixture,
  createTempDir,
  isEmptyDir,
  pathExists,
  privateTempDir,
  removeDir,
  renameDir,
  writeFiles
} from './fixture-files.ts';
import type { FixtureFile } from '../common/fixture.type.ts';
import { fileTree } from '../test/utils/file-tree.spec.util.ts';
import { stubTempDir } from '../test/utils/temp-env.spec.util.ts';

const NESTED_FILES: FixtureFile[] = [
  { path: '.gitignore', content: 'node_modules/\n' },
  { path: 'packages/pkg-001/src/index.ts', content: 'export const name = 1;\n' }
];

const IS_WINDOWS = process.platform === 'win32';

/** A junction needs no admin rights on Windows; elsewhere a plain dir symlink. */
const LINK_TYPE = IS_WINDOWS ? 'junction' : 'dir';

const UID_SUFFIX = process.getuid?.() ?? 'user';

describe('FEATURE: fixture files on disk', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'repo-gen-files-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('GIVEN a target dir that does not exist yet', () => {
    it('WHEN files with nested paths are written THEN each lands under the dir with its exact content', async () => {
      const dir = join(root, 'with space', 'repo');

      await writeFiles(dir, NESTED_FILES);

      expect(await fileTree(dir)).toStrictEqual([
        ['.gitignore', 'node_modules/\n'],
        ['packages/pkg-001/src/index.ts', 'export const name = 1;\n']
      ]);
    });
  });

  describe('GIVEN a written repo', () => {
    beforeEach(async () => {
      await writeFiles(join(root, 'repo'), NESTED_FILES);
    });

    it('WHEN text is appended to a missing path among existing ones THEN it rejects and changes no file', async () => {
      const before = await fileTree(join(root, 'repo'));

      const append = appendToFiles(join(root, 'repo'), ['.gitignore', 'missing.ts'], '\n// edit\n');

      await expect(append).rejects.toThrow('missing.ts');
      expect(await fileTree(join(root, 'repo'))).toStrictEqual(before);
    });

    it('WHEN text is appended to two files THEN both end with it', async () => {
      await appendToFiles(join(root, 'repo'), ['.gitignore', 'packages/pkg-001/src/index.ts'], '\n// edit\n');

      expect(await fileTree(join(root, 'repo'))).toStrictEqual([
        ['.gitignore', 'node_modules/\n\n// edit\n'],
        ['packages/pkg-001/src/index.ts', 'export const name = 1;\n\n// edit\n']
      ]);
    });

    it('WHEN it is copied THEN the copy holds the same files, dotfiles included', async () => {
      await copyFixture(join(root, 'repo'), join(root, 'copy'));

      expect(await fileTree(join(root, 'copy'))).toStrictEqual(await fileTree(join(root, 'repo')));
    });

    it('WHEN it is renamed THEN the old path is gone and the new one holds the files', async () => {
      await renameDir(join(root, 'repo'), join(root, 'renamed'));

      expect(await pathExists(join(root, 'repo'))).toBe(false);
      expect(await readFile(join(root, 'renamed', '.gitignore'), 'utf8')).toBe('node_modules/\n');
    });

    it('WHEN it is renamed onto a non-empty dir THEN the rename rejects', async () => {
      await writeFiles(join(root, 'taken'), NESTED_FILES);

      const rename = renameDir(join(root, 'repo'), join(root, 'taken'));

      await expect(rename).rejects.toThrow();
    });

    it('WHEN it is removed THEN pathExists reports false', async () => {
      await removeDir(join(root, 'repo'));

      expect(await pathExists(join(root, 'repo'))).toBe(false);
    });

    it('WHEN pathExists is asked about it THEN it reports true', async () => {
      const exists = await pathExists(join(root, 'repo'));

      expect(exists).toBe(true);
    });
  });

  describe('GIVEN the OS temp dir is reached through a link', () => {
    let realRoot = '';

    beforeEach(async () => {
      realRoot = await realpath(root);
      await mkdir(join(root, 'real'));
      await symlink(join(root, 'real'), join(root, 'link'), LINK_TYPE);
      stubTempDir(join(root, 'link'));
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('WHEN a temp dir is created THEN it exists and its path is resolved past the link', async () => {
      const dir = await createTempDir('repo-gen-created-');

      const exists = await pathExists(dir);

      expect(exists).toBe(true);
      expect(dir.startsWith(join(realRoot, 'real', 'repo-gen-created-'))).toBe(true);
    });

    it('WHEN a private temp dir is requested THEN it is <temp>/<name>-<uid>, resolved past the link', async () => {
      const dir = await privateTempDir('repo-gen-private');

      expect(dir).toBe(join(realRoot, 'real', `repo-gen-private-${UID_SUFFIX}`));
    });

    it('WHEN a private temp dir is requested twice THEN both calls return the same dir', async () => {
      const first = await privateTempDir('repo-gen-private');

      const second = await privateTempDir('repo-gen-private');

      expect(second).toBe(first);
    });

    it.skipIf(IS_WINDOWS)('WHEN a private temp dir is created THEN only its owner may read, write or enter it', async () => {
      const dir = await privateTempDir('repo-gen-private');

      const stats = await stat(dir);

      expect(stats.mode & 0o777).toBe(0o700);
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a pre-existing private temp dir name that is not private', () => {
    const name = `repo-gen-private-${UID_SUFFIX}`;

    beforeEach(() => {
      stubTempDir(root);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('WHEN it has group or other permission bits THEN the request rejects naming it', async () => {
      await mkdir(join(root, name), { mode: 0o700 });
      await chmod(join(root, name), 0o750);

      const request = privateTempDir('repo-gen-private');

      await expect(request).rejects.toThrow(`${name} is not private`);
    });

    it('WHEN it is a symlink THEN the request rejects naming it', async () => {
      await mkdir(join(root, 'target'), { mode: 0o700 });
      await symlink(join(root, 'target'), join(root, name));

      const request = privateTempDir('repo-gen-private');

      await expect(request).rejects.toThrow(`${name} is not private`);
    });
  });

  describe('GIVEN a dir to check for emptiness', () => {
    it('WHEN it is absent THEN it counts as empty', async () => {
      const isEmpty = await isEmptyDir(join(root, 'absent'));

      expect(isEmpty).toBe(true);
    });

    it('WHEN it exists with no entries THEN it counts as empty', async () => {
      await mkdir(join(root, 'empty'));

      const isEmpty = await isEmptyDir(join(root, 'empty'));

      expect(isEmpty).toBe(true);
    });

    it('WHEN it holds only a dotfile THEN it does not count as empty', async () => {
      await writeFiles(join(root, 'dotted'), [{ path: '.keep', content: '' }]);

      const isEmpty = await isEmptyDir(join(root, 'dotted'));

      expect(isEmpty).toBe(false);
    });
  });
});
