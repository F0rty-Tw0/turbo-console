import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appendToFiles, copyFixture, createTempDir, pathExists, removeDir, renameDir, tempPath, writeFiles } from './fixture-files.ts';
import type { FixtureFile } from '../common/fixture.type.ts';
import { fileTree } from '../test/utils/file-tree.spec.util.ts';

const NESTED_FILES: FixtureFile[] = [
  { path: '.gitignore', content: 'node_modules/\n' },
  { path: 'packages/pkg-001/src/index.ts', content: 'export const name = 1;\n' }
];

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

  describe('GIVEN the OS temp dir', () => {
    it('WHEN a temp dir is created THEN it exists under the OS temp dir with the prefix', async () => {
      const dir = await createTempDir('repo-gen-created-');

      const exists = await pathExists(dir);

      await removeDir(dir);

      expect(exists).toBe(true);
      expect(dir.startsWith(join(tmpdir(), 'repo-gen-created-'))).toBe(true);
    });

    it('WHEN a temp path is built THEN it joins the segments under the OS temp dir', () => {
      const path = tempPath('turbo-console-fixtures', 'abc');

      expect(path).toBe(join(tmpdir(), 'turbo-console-fixtures', 'abc'));
    });
  });
});
