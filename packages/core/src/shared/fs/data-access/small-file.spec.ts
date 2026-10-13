import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readSmallFile } from './small-file.ts';

/** procfs reports size 0 for its files; its text here is fixed for the life of the process. */
const PROC_FILE = '/proc/self/cmdline';

/** A cap far below the 1 MiB default, so a file over it costs a few bytes. */
const MAX_BYTES = 8;

let tempDir = '';

describe('FEATURE: small file reading', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'small-file-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe.skipIf(process.platform !== 'linux')('GIVEN a procfs file that reports size 0', () => {
    it('WHEN it is read THEN its whole text is returned', async () => {
      const stats = await stat(PROC_FILE);
      const expected = await readFile(PROC_FILE, 'utf8');

      const text = await readSmallFile(PROC_FILE);

      expect(stats.size).toBe(0);
      expect(expected.length).toBeGreaterThan(2);
      expect(text).toBe(expected);
    });
  });

  describe('GIVEN a caller cap of 8 bytes', () => {
    it('WHEN the file holds exactly 8 bytes THEN its text is returned', async () => {
      const path = join(tempDir, 'at-cap.txt');

      await writeFile(path, '12345678');

      await expect(readSmallFile(path, MAX_BYTES)).resolves.toBe('12345678');
    });

    it('WHEN the file holds 9 bytes THEN it is null', async () => {
      const path = join(tempDir, 'over-cap.txt');

      await writeFile(path, '123456789');

      await expect(readSmallFile(path, MAX_BYTES)).resolves.toBeNull();
    });
  });
});
