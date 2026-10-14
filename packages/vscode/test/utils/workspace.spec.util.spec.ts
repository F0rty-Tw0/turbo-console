import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { snapshotDir } from './workspace.spec.util.ts';

describe('FEATURE: snapshotDir', () => {
  let scratch = '';
  let dir = '';

  beforeEach(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'tc-snapshot-'));
    dir = join(scratch, 'user-data');
    await mkdir(join(dir, 'globalStorage'), { recursive: true });
    await writeFile(join(dir, 'globalStorage', 'cache.json'), 'first\n');
  });

  afterEach(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  describe('GIVEN a snapshot of a user-data dir', () => {
    it('WHEN an attempt changed and added files THEN restore brings back the snapshot state', async () => {
      const restore = await snapshotDir(dir, join(scratch, 'copy'));

      await writeFile(join(dir, 'globalStorage', 'cache.json'), 'second\n');
      await writeFile(join(dir, 'added.json'), '{}\n');
      await restore();

      const cache = await readFile(join(dir, 'globalStorage', 'cache.json'), 'utf8');
      const entries = await readdir(dir);

      expect(cache).toBe('first\n');
      expect(entries).toStrictEqual(['globalStorage']);
    });

    it('WHEN restore runs twice THEN the second restore starts over from the snapshot too', async () => {
      const restore = await snapshotDir(dir, join(scratch, 'copy'));

      await rm(join(dir, 'globalStorage'), { recursive: true });
      await restore();
      await writeFile(join(dir, 'globalStorage', 'cache.json'), 'third\n');
      await restore();

      const cache = await readFile(join(dir, 'globalStorage', 'cache.json'), 'utf8');

      expect(cache).toBe('first\n');
    });
  });
});
