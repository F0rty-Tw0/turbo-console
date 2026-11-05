import { open } from 'node:fs/promises';
import type * as nodeFsPromises from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

import { editorRunLogPorts } from './run-log-fs.ts';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof nodeFsPromises>();
  const mocked = { ...actual, open: vi.fn(actual.open) };

  return mocked;
});

const errorWithCode = (code: string): Error => Object.assign(new Error(code), { code });

describe("FEATURE: the log tails' read port on a failing open (spec D5)", () => {
  const ports = editorRunLogPorts(vi.fn());

  describe('GIVEN an open that fails', () => {
    it('WHEN the file is briefly held (EPERM) THEN read gives null so the next change retries', async () => {
      vi.mocked(open).mockRejectedValueOnce(errorWithCode('EPERM'));

      const bytes = await ports.read('run-1.json', 0, 4);

      expect(bytes).toBeNull();
    });

    it('WHEN the error is not retryable (EIO) THEN read rejects with it', async () => {
      const failure = errorWithCode('EIO');

      vi.mocked(open).mockRejectedValueOnce(failure);

      await expect(ports.read('run-1.json', 0, 4)).rejects.toBe(failure);
    });
  });
});
