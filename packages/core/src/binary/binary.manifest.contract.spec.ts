import { execFileSync } from 'node:child_process';
import type * as fsPromises from 'node:fs/promises';
import { mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, resolveTurbo } from '../index.ts';
import type { CloseFault } from './test/common/fake-turbo.type.ts';
import { TURBO_MANIFEST, installPlatformBinary, manifestPathOf, workspaceAt } from './test/utils/fake-turbo.spec.util.ts';

const closeFault = vi.hoisted(() => {
  const state: CloseFault = { failNext: false };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();
  const { faultyCloseOpen } = await import('./test/utils/faulty-close.spec.util.ts');
  const mocked = { ...real, open: faultyCloseOpen(real.open, closeFault) };

  return mocked;
});

const MAX_MANIFEST_BYTES = 1024 * 1024;

/** Trailing spaces keep it valid JSON, so only the size bound can reject it. */
const padManifest = (bytes: number): string => `${TURBO_MANIFEST}${' '.repeat(bytes - TURBO_MANIFEST.length)}`;

/** mkfifo, and symlinks without extra privileges, are POSIX only. */
const IS_POSIX = process.platform !== 'win32';

const rejectionOf = async (root: string): Promise<unknown> => resolveTurbo(root, { trusted: true }).catch((error: unknown) => error);

const invalidMessage = (root: string): string => `${manifestPathOf(root)} is not a valid turbo package.json`;

describe('FEATURE: turbo package.json reading', () => {
  let tempDir = '';

  /** A workspace whose turbo has a platform binary, so only the manifest can fail it. */
  const installedWorkspace = async (name: string, manifest?: string): Promise<string> => {
    const root = await workspaceAt(join(tempDir, name), manifest);

    await installPlatformBinary(join(root, 'node_modules'));

    return root;
  };

  beforeAll(async () => {
    const created = await mkdtemp(join(tmpdir(), 'binary-manifest-'));

    tempDir = await realpath(created);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    closeFault.failNext = false;
  });

  describe('GIVEN a manifest that is a regular file', () => {
    it('WHEN it is not JSON THEN it rejects invalid-output naming the manifest, with no file text attached', async () => {
      const root = await installedWorkspace('not-json', '{');

      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'invalid-output', message: invalidMessage(root) });
      expect(error).not.toHaveProperty('cause');
    });

    it('WHEN it has no version THEN it rejects invalid-output naming the manifest', async () => {
      const root = await installedWorkspace('no-version', '{"name":"turbo"}');

      const error = await rejectionOf(root);

      expect(error).toMatchObject({ kind: 'invalid-output', message: invalidMessage(root) });
    });

    it('WHEN it is exactly 1 MiB THEN it is read', async () => {
      const root = await installedWorkspace('exact', padManifest(MAX_MANIFEST_BYTES));

      const resolved = await resolveTurbo(root, { trusted: true });

      expect(resolved).toMatchObject({ version: '2.11.7', source: 'workspace' });
    });

    it('WHEN it is one byte over 1 MiB THEN it rejects invalid-output without parsing it', async () => {
      const root = await installedWorkspace('over', padManifest(MAX_MANIFEST_BYTES + 1));

      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'invalid-output', message: invalidMessage(root) });
    });
  });

  describe('GIVEN a manifest that is not a regular file', () => {
    it.skipIf(!IS_POSIX)('WHEN it is a directory THEN it rejects invalid-output', async () => {
      const root = await installedWorkspace('directory');

      await mkdir(manifestPathOf(root), { recursive: true });

      const error = await rejectionOf(root);

      expect(error).toMatchObject({ kind: 'invalid-output', message: invalidMessage(root) });
    });

    it.skipIf(!IS_POSIX)('WHEN it is a FIFO THEN it rejects invalid-output instead of blocking on the read', async () => {
      const root = await installedWorkspace('fifo');

      await mkdir(dirname(manifestPathOf(root)), { recursive: true });
      execFileSync('mkfifo', [manifestPathOf(root)]);

      const error = await rejectionOf(root);

      expect(error).toMatchObject({ kind: 'invalid-output', message: invalidMessage(root) });
    });

    // procfs files report size 0 and are read to their end.
    it.skipIf(process.platform !== 'linux')('WHEN it links to /proc/self/environ THEN it rejects invalid-output with no file text attached', async () => {
      const root = await installedWorkspace('environ');

      await mkdir(dirname(manifestPathOf(root)), { recursive: true });
      await symlink('/proc/self/environ', manifestPathOf(root));

      const error = await rejectionOf(root);

      expect(error).toMatchObject({ kind: 'invalid-output', message: invalidMessage(root) });
      expect(error).not.toHaveProperty('cause');
    });
  });

  describe('GIVEN closing the manifest fails', () => {
    it('WHEN the read itself succeeded THEN it rejects io naming the manifest', async () => {
      const root = await installedWorkspace('close-after-read', TURBO_MANIFEST);

      closeFault.failNext = true;
      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'io', message: `${manifestPathOf(root)}: EIO` });
    });

    it('WHEN the read had already failed THEN that failure is kept', async () => {
      const root = await installedWorkspace('close-after-failure', padManifest(MAX_MANIFEST_BYTES + 1));

      closeFault.failNext = true;
      const error = await rejectionOf(root);

      expect(error).toMatchObject({ kind: 'invalid-output', message: invalidMessage(root) });
    });
  });
});
