import { readFile, stat } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { readSmallFile } from './small-file.ts';

/** procfs reports size 0 for its files; its text here is fixed for the life of the process. */
const PROC_FILE = '/proc/self/cmdline';

describe('FEATURE: small file reading', () => {
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
});
