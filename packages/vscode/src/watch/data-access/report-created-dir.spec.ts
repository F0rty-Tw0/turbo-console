import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { reportCreatedDir } from './report-created-dir.ts';

describe('FEATURE: report a created folder', () => {
  let root = '';
  let outside = '';

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'report-created-dir-'));
    outside = await mkdtemp(join(tmpdir(), 'report-created-dir-outside-'));

    await mkdir(join(root, 'packages', 'a'), { recursive: true });
    await writeFile(join(root, 'packages', 'a', 'package.json'), '{}');
    await mkdir(join(root, 'packages', 'bare'));
    await mkdir(join(root, 'packages', 'dir', 'package.json'), { recursive: true });
    await mkdir(join(root, 'node_modules', 'dep'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'dep', 'package.json'), '{}');
    await mkdir(join(outside, 'b'));
    await writeFile(join(outside, 'b', 'package.json'), '{}');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
    await rm(outside, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a created folder holding package.json', () => {
    it('WHEN it is reported THEN the change is requested once', async () => {
      const changed = vi.fn();

      await reportCreatedDir(root, join(root, 'packages', 'a'), changed);

      expect(changed).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN a created folder without a package.json file', () => {
    it('WHEN it is empty THEN no change is requested', async () => {
      const changed = vi.fn();

      await reportCreatedDir(root, join(root, 'packages', 'bare'), changed);

      expect(changed).not.toHaveBeenCalled();
    });

    it('WHEN package.json is a folder THEN no change is requested', async () => {
      const changed = vi.fn();

      await reportCreatedDir(root, join(root, 'packages', 'dir'), changed);

      expect(changed).not.toHaveBeenCalled();
    });

    it('WHEN the folder is already gone THEN no change is requested', async () => {
      const changed = vi.fn();

      await reportCreatedDir(root, join(root, 'packages', 'gone'), changed);

      expect(changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a created folder under node_modules', () => {
    it('WHEN it holds package.json THEN no change is requested', async () => {
      const changed = vi.fn();

      await reportCreatedDir(root, join(root, 'node_modules', 'dep'), changed);

      expect(changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a created folder outside the root', () => {
    it('WHEN it holds package.json THEN no change is requested', async () => {
      const changed = vi.fn();

      await reportCreatedDir(root, join(outside, 'b'), changed);

      expect(changed).not.toHaveBeenCalled();
    });
  });
});
