import { EventEmitter } from 'node:events';
import { watch } from 'node:fs';
import type * as nodeFs from 'node:fs';
import { open } from 'node:fs/promises';
import type * as nodeFsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { editorRunLogPorts } from './run-log-fs.ts';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof nodeFs>();
  const mocked = { ...actual, watch: vi.fn(actual.watch) };

  return mocked;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof nodeFsPromises>();
  const mocked = { ...actual, open: vi.fn(actual.open) };

  return mocked;
});

const errorWithCode = (code: string): Error => Object.assign(new Error(code), { code });

describe("FEATURE: the log tails' file ports when the file system fails (spec D5)", () => {
  const ports = editorRunLogPorts(vi.fn());

  describe('GIVEN a watched folder whose watcher fails after it started', () => {
    it('WHEN it emits an error THEN onError gets that error and nothing throws', () => {
      const onError = vi.fn();
      const failure = new Error('watch broke');
      const watcher = ports.watch(tmpdir(), vi.fn(), onError);
      const started: unknown = vi.mocked(watch).mock.results[0]?.value;
      const fail = (): void => {
        if (started instanceof EventEmitter) started.emit('error', failure);
      };

      expect(started).toBeInstanceOf(EventEmitter);
      expect(fail).not.toThrow();
      watcher.close();
      expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    });
  });

  describe('GIVEN an open that fails', () => {
    it('WHEN the file is briefly held (EPERM) THEN read gives null so the next change retries', async () => {
      vi.mocked(open).mockRejectedValueOnce(errorWithCode('EPERM'));

      const bytes = await ports.read('run-1.json', 0, 4);

      expect(bytes).toBeNull();
    });

    it('WHEN the error is not retryable (EIO) THEN read rejects with it', async () => {
      vi.mocked(open).mockRejectedValueOnce(errorWithCode('EIO'));

      await expect(ports.read('run-1.json', 0, 4)).rejects.toThrow('EIO');
    });
  });
});
