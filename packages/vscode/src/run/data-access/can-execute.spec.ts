import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { canExecute } from './can-execute.ts';

const isWindows = process.platform === 'win32';

describe('FEATURE: whether the turbo binary can run', () => {
  let parent = '';

  beforeAll(async () => {
    parent = await mkdtemp(join(tmpdir(), 'can-execute-'));

    await writeFile(join(parent, 'turbo'), '', { mode: 0o755 });
    await writeFile(join(parent, 'plain'), '', { mode: 0o644 });
  });

  afterAll(async () => {
    await rm(parent, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN an executable file', () => {
    it('WHEN it is checked THEN it can run', async () => {
      const isRunnable = await canExecute(join(parent, 'turbo'));

      expect(isRunnable).toBe(true);
    });
  });

  describe('GIVEN no file at the path', () => {
    it('WHEN it is checked THEN it cannot run', async () => {
      const isRunnable = await canExecute(join(parent, 'missing'));

      expect(isRunnable).toBe(false);
    });
  });

  describe('GIVEN a file without the execute bit on POSIX', () => {
    it.skipIf(isWindows)('WHEN it is checked THEN it cannot run', async () => {
      const isRunnable = await canExecute(join(parent, 'plain'));

      expect(isRunnable).toBe(false);
    });
  });

  describe('GIVEN any existing file on Windows', () => {
    it.runIf(isWindows)('WHEN it is checked THEN it can run', async () => {
      const isRunnable = await canExecute(join(parent, 'plain'));

      expect(isRunnable).toBe(true);
    });
  });
});
