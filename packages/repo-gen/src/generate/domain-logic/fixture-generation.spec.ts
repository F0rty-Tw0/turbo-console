import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyEdit, generateFixture, writeFixture } from './fixture-generation.ts';
import { PRESETS } from '../common/fixture.const.ts';
import { git } from '../data-access/git.ts';
import { fileTree } from '../test/utils/file-tree.spec.util.ts';

const TARGET_LIKE = PRESETS['target-like'];

describe('FEATURE: fixture generation', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'repo-gen-generate-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('GIVEN the target-like preset and a target dir under a dir named "with space"', () => {
    let dir = '';

    beforeEach(() => {
      dir = join(root, 'with space', 'repo');
    });

    describe('WHEN generated', () => {
      it('THEN the log is one "base" commit', async () => {
        await generateFixture(TARGET_LIKE, dir);

        const log = await git(dir, ['log', '--format=%s']);

        expect(log).toBe('base\n');
      });

      it('THEN the branch is main', async () => {
        await generateFixture(TARGET_LIKE, dir);

        const branch = await git(dir, ['branch', '--show-current']);

        expect(branch).toBe('main\n');
      });

      it('THEN the working tree is clean and every file is committed', async () => {
        await generateFixture(TARGET_LIKE, dir);

        const status = await git(dir, ['status', '--porcelain']);
        const tracked = await git(dir, ['ls-files']);
        const tree = await fileTree(dir);

        expect(status).toBe('');
        expect(tracked.trim().split('\n')).toHaveLength(tree.length);
      });

      it('THEN the manifest lists the preset package count', async () => {
        const manifest = await generateFixture(TARGET_LIKE, dir);

        expect(manifest.packages).toHaveLength(TARGET_LIKE.packages);
      });
    });

    it('WHEN generated twice into two dirs THEN the file trees and manifests are identical', async () => {
      const other = join(root, 'other');

      const manifests = await Promise.all([generateFixture(TARGET_LIKE, dir), generateFixture(TARGET_LIKE, other)]);
      const trees = await Promise.all([fileTree(dir), fileTree(other)]);

      expect(manifests[0]).toStrictEqual(manifests[1]);
      expect(trees[0]).toStrictEqual(trees[1]);
    });

    describe('WHEN generated and then edited', () => {
      const paths = ['packages/hub/src/index.ts', 'packages/hub/README.md'];

      beforeEach(async () => {
        await generateFixture(TARGET_LIKE, dir);
        await applyEdit(dir, paths);
      });

      it('THEN the log is "head" then "base"', async () => {
        const log = await git(dir, ['log', '--format=%s']);

        expect(log).toBe('head\nbase\n');
      });

      it('THEN the head commit changes exactly the edited paths', async () => {
        const changed = await git(dir, ['diff', '--name-only', 'HEAD~1', 'HEAD']);

        expect(changed.trim().split('\n').toSorted()).toStrictEqual(paths.toSorted());
      });

      it('THEN each edited file ends with the edit line', async () => {
        const content = await readFile(join(dir, 'packages/hub/README.md'), 'utf8');

        expect(content).toBe('# @fx/hub\n\n// edit\n');
      });
    });
  });

  describe('GIVEN the target-like preset and an out dir', () => {
    it('WHEN written with its manifest THEN <out>.manifest.json sits beside the repo and holds the manifest', async () => {
      const out = join(root, 'out');

      const manifest = await writeFixture(TARGET_LIKE, out);
      const written = await readFile(`${out}.manifest.json`, 'utf8');

      expect(written).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
    });

    it('WHEN written with its manifest THEN the repo tree holds no manifest file', async () => {
      const out = join(root, 'out');

      await writeFixture(TARGET_LIKE, out);
      const tree = await fileTree(out);
      const manifestPaths = tree.filter(([path]) => path.includes('manifest'));

      expect(manifestPaths).toStrictEqual([]);
    });
  });
});
