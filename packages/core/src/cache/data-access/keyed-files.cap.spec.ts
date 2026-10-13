import { createHash } from 'node:crypto';
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { hashKeyedFiles } from './keyed-files.ts';
import type * as cacheConst from '../common/cache.const.ts';
import type { KeyedFile } from '../common/cache.type.ts';

/** Small enough to cross without writing the real 256 MiB, and over one 64 KiB read chunk so the cap spans reads. */
const CAP_BYTES = vi.hoisted(() => 100 * 1024);

vi.mock('../common/cache.const.ts', async (importOriginal) => {
  const real = await importOriginal<typeof cacheConst>();
  // eslint-disable-next-line @typescript-eslint/naming-convention -- the mocked module's own constant name.
  const mocked = { ...real, MAX_KEYED_FILE_BYTES: CAP_BYTES };

  return mocked;
});

/** Whole seconds, so the mtime a stat reports back is exact on every filesystem. */
const FIRST_MTIME_S = 1_000_000_000;

const SECOND_MTIME_S = 1_000_000_100;

let root = '';

const sha256Of = (data: Buffer): string => {
  const hash = createHash('sha256');

  hash.update(data);

  return hash.digest('hex');
};

describe('FEATURE: keyed file byte cap', () => {
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'keyed-files-cap-'));
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a regular file', () => {
    it('WHEN it holds exactly the cap THEN its digest is the sha256 of its content', async () => {
      const content = Buffer.alloc(CAP_BYTES, 'a');

      await writeFile(join(root, 'at-cap.json'), content);

      const files = await hashKeyedFiles(root, ['at-cap.json']);

      expect(files[0]?.digest).toBe(sha256Of(content));
    });

    it('WHEN it holds one byte over the cap THEN it is keyed by its size and mtime', async () => {
      const path = join(root, 'over-cap.json');

      await writeFile(path, Buffer.alloc(CAP_BYTES + 1, 'a'));
      await utimes(path, FIRST_MTIME_S, FIRST_MTIME_S);

      const files = await hashKeyedFiles(root, ['over-cap.json']);
      const mtimeMs = FIRST_MTIME_S * 1000;
      const expected: KeyedFile = { path: 'over-cap.json', digest: `over-cap:${CAP_BYTES + 1}:${mtimeMs}`, mtimeMs };

      expect(files).toStrictEqual([expected]);
    });

    it('WHEN an over-cap file is rewritten at the same size with a new mtime THEN its digest changes', async () => {
      const path = join(root, 'rewritten.json');

      await writeFile(path, Buffer.alloc(CAP_BYTES + 1, 'a'));
      await utimes(path, FIRST_MTIME_S, FIRST_MTIME_S);

      const [before] = await hashKeyedFiles(root, ['rewritten.json']);

      await writeFile(path, Buffer.alloc(CAP_BYTES + 1, 'b'));
      await utimes(path, SECOND_MTIME_S, SECOND_MTIME_S);

      const [after] = await hashKeyedFiles(root, ['rewritten.json']);

      expect(after?.digest).not.toBe(before?.digest);
    });
  });
});
