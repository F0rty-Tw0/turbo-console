import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { editorRunLogPorts } from './run-log-fs.ts';
import { textOf } from '../test/utils/run-log-bytes.spec.util.ts';

const MTIME_S = 1_700_000_000;

describe("FEATURE: the log tails' file ports (spec D5)", () => {
  const ports = editorRunLogPorts(vi.fn());
  let root = '';

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'run-log-fs-'));

    await writeFile(join(root, 'digits.json'), '0123456789');
    await utimes(join(root, 'digits.json'), MTIME_S, MTIME_S);
    await mkdir(join(root, 'two'));
    await writeFile(join(root, 'two', 'run-1.json'), '');
    await writeFile(join(root, 'two', 'run-2.json'), '');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a file holding "0123456789"', () => {
    it.each([
      ['4 bytes from 3', 3, 4, '3456'],
      ['past its end', 8, 4, '89'],
      ['from its end', 10, 4, ''],
      ['from beyond its end', 12, 4, '']
    ])('WHEN %s are read THEN the bytes that exist', async (_, from, max, text) => {
      const bytes = await ports.read(join(root, 'digits.json'), from, max);

      expect(textOf(bytes)).toBe(text);
    });

    it('WHEN its mtime is asked THEN the mtime on disk in ms', async () => {
      const mtime = await ports.modifiedAt(join(root, 'digits.json'));

      expect(mtime).toBe(MTIME_S * 1000);
    });
  });

  describe('GIVEN a folder path', () => {
    it('WHEN read THEN it rejects, as only a missing or briefly held file reads as null', async () => {
      const read = ports.read(join(root, 'two'), 0, 4);

      await expect(read).rejects.toThrow();
    });
  });

  describe('GIVEN the clock', () => {
    it('WHEN now is asked THEN a time between two Date.now() calls', () => {
      const before = Date.now();
      const now = ports.now();
      const after = Date.now();

      expect([before <= now, now <= after]).toStrictEqual([true, true]);
    });
  });

  describe('GIVEN a missing file', () => {
    it('WHEN read THEN null', async () => {
      const bytes = await ports.read(join(root, 'gone.json'), 0, 4);

      expect(bytes).toBeNull();
    });

    it('WHEN its mtime is asked THEN null', async () => {
      const mtime = await ports.modifiedAt(join(root, 'gone.json'));

      expect(mtime).toBeNull();
    });

    it('WHEN removed THEN nothing throws', async () => {
      const removed = ports.remove(join(root, 'gone.json'));

      await expect(removed).resolves.toBeUndefined();
    });
  });

  describe('GIVEN a folder with two files', () => {
    it('WHEN listed, one removed and listed again THEN both names, then the other', async () => {
      const dir = join(root, 'two');
      const before = await ports.list(dir);

      await ports.remove(join(dir, 'run-1.json'));
      const after = await ports.list(dir);
      const sortedBefore = before.toSorted();

      expect([sortedBefore, after]).toStrictEqual([['run-1.json', 'run-2.json'], ['run-2.json']]);
    });
  });

  describe('GIVEN a missing folder', () => {
    it('WHEN listed THEN an empty list', async () => {
      const names = await ports.list(join(root, 'nowhere'));

      expect(names).toStrictEqual([]);
    });

    it('WHEN watched THEN onError gets the error and the watcher closes without throwing', () => {
      const onError = vi.fn();
      const watcher = ports.watch(join(root, 'nowhere'), vi.fn(), onError);
      const close = (): void => {
        watcher.close();
      };

      expect(close).not.toThrow();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'ENOENT' }));
    });
  });
});
