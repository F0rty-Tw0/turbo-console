import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findRoots } from './find-roots.ts';
import type { RootFolder } from '../common/root.type.ts';

const folderAt = (parent: string, name: string): RootFolder => {
  const folder: RootFolder = { root: join(parent, name), name };

  return folder;
};

describe('FEATURE: find roots', () => {
  let parent = '';

  beforeAll(async () => {
    parent = await mkdtemp(join(tmpdir(), 'find-roots-'));

    await mkdir(join(parent, 'json'));
    await writeFile(join(parent, 'json', 'turbo.json'), '{}');
    await mkdir(join(parent, 'jsonc'));
    await writeFile(join(parent, 'jsonc', 'turbo.jsonc'), '{}');
    await mkdir(join(parent, 'bare'));
    await mkdir(join(parent, 'dir', 'turbo.json'), { recursive: true });
    await mkdir(join(parent, 'nested', 'a'), { recursive: true });
    await writeFile(join(parent, 'nested', 'a', 'turbo.json'), '{}');
    await writeFile(join(parent, 'file'), 'not a directory');
  });

  afterAll(async () => {
    await rm(parent, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a folder holding turbo.json', () => {
    it('WHEN roots are found THEN the folder is kept', async () => {
      const folders = [folderAt(parent, 'json')];

      const roots = await findRoots(folders);

      expect(roots).toStrictEqual(folders);
    });
  });

  describe('GIVEN a folder holding turbo.jsonc', () => {
    it('WHEN roots are found THEN the folder is kept', async () => {
      const folders = [folderAt(parent, 'jsonc')];

      const roots = await findRoots(folders);

      expect(roots).toStrictEqual(folders);
    });
  });

  describe('GIVEN a folder holding neither file', () => {
    it('WHEN roots are found THEN the folder is dropped', async () => {
      const roots = await findRoots([folderAt(parent, 'bare')]);

      expect(roots).toStrictEqual([]);
    });
  });

  describe('GIVEN a folder whose turbo.json is a directory', () => {
    it('WHEN roots are found THEN the folder is dropped', async () => {
      const roots = await findRoots([folderAt(parent, 'dir')]);

      expect(roots).toStrictEqual([]);
    });
  });

  describe('GIVEN a folder holding turbo.json only in a nested directory', () => {
    it('WHEN roots are found THEN the folder is dropped', async () => {
      const roots = await findRoots([folderAt(parent, 'nested')]);

      expect(roots).toStrictEqual([]);
    });
  });

  describe('GIVEN a folder that does not exist', () => {
    it('WHEN roots are found THEN the folder is dropped', async () => {
      const roots = await findRoots([folderAt(parent, 'missing')]);

      expect(roots).toStrictEqual([]);
    });
  });

  describe('GIVEN a folder path that is a regular file', () => {
    it('WHEN roots are found THEN the folder is dropped', async () => {
      const roots = await findRoots([folderAt(parent, 'file')]);

      expect(roots).toStrictEqual([]);
    });
  });

  describe('GIVEN a mix of folders', () => {
    it('WHEN roots are found THEN the roots come back in input order', async () => {
      const jsonc = folderAt(parent, 'jsonc');
      const json = folderAt(parent, 'json');
      const folders = [jsonc, folderAt(parent, 'bare'), json, folderAt(parent, 'dir')];

      const roots = await findRoots(folders);

      expect(roots).toStrictEqual([jsonc, json]);
    });
  });

  describe('GIVEN no folders', () => {
    it('WHEN roots are found THEN there are none', async () => {
      const roots = await findRoots([]);

      expect(roots).toStrictEqual([]);
    });
  });
});
