import { mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises';
import { Module, createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, resolveTurbo } from '../index.ts';
import {
  LEGACY_BINARY,
  SCOPED_BINARY,
  TURBO_MANIFEST,
  installPlatformBinary,
  manifestPathOf,
  workspaceAt,
  writeFileIn
} from './test/utils/fake-turbo.spec.util.ts';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');

const TRUSTED = { trusted: true } as const;

/** `process.env` is an index signature: a named key keeps `noPropertyAccessFromIndexSignature` and `dot-notation` both happy. */
const NODE_PATH = 'NODE_PATH';

/** `@turbo/<os>-<arch>`, the scoped platform package's own dir. */
const SCOPED_PACKAGE = dirname(dirname(SCOPED_BINARY));

/** Symlinks need extra privileges on Windows. */
const CAN_SYMLINK = process.platform !== 'win32';

const rejectionOf = async (root: string, signal?: AbortSignal): Promise<unknown> => {
  const options = { trusted: true, signal } as const;

  return resolveTurbo(root, options).catch((error: unknown) => error);
};

const noBinaryMessage = (root: string): string =>
  `no turbo binary for ${process.platform}-${process.arch} inside ${join(root, 'node_modules')} (a turbo linked from elsewhere needs overridePath)`;

/** Node reads `NODE_PATH` into its global lookup paths once at startup; this re-reads it. */
const reloadGlobalPaths = (): void => {
  const initPaths: unknown = Reflect.get(Module, '_initPaths');

  if (typeof initPaths === 'function') Reflect.apply(initPaths, Module, []);
};

describe('FEATURE: workspace turbo lookup, root only', () => {
  describe('GIVEN a root that does not exist under this repo', () => {
    const missingRoot = join(REPO_ROOT, 'no-such-dir');

    it('WHEN resolved THEN it rejects io naming the root instead of finding the repo turbo above it', async () => {
      const error = await rejectionOf(missingRoot);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'io', message: `${missingRoot}: ENOENT` });
    });

    it('WHEN resolved with an already aborted signal THEN the root is still checked and it rejects io', async () => {
      const error = await rejectionOf(missingRoot, AbortSignal.abort());

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'io', message: `${missingRoot}: ENOENT` });
    });
  });

  describe('GIVEN a root holding a NUL byte', () => {
    it('WHEN resolved THEN it rejects invalid-argument before touching the disk', async () => {
      const error = await rejectionOf(`${REPO_ROOT}\0x`);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'invalid-argument' });
    });
  });

  describe('GIVEN a root that is not absolute', () => {
    it.each(['', 'packages/core'])('WHEN %j is resolved THEN it rejects invalid-argument instead of using the process cwd', async (root) => {
      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'invalid-argument', message: `turbo root must be absolute: ${root}` });
    });
  });

  describe('GIVEN temp workspaces', () => {
    let tempDir = '';

    beforeAll(async () => {
      const created = await mkdtemp(join(tmpdir(), 'binary-workspace-'));

      tempDir = await realpath(created);
    });

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
    });

    it('WHEN turbo and its platform package sit in the root node_modules (npm layout) THEN that binary is resolved', async () => {
      const root = await workspaceAt(join(tempDir, 'npm'), TURBO_MANIFEST);
      const binary = await installPlatformBinary(join(root, 'node_modules'));

      const resolved = await resolveTurbo(root, TRUSTED);

      expect(resolved).toMatchObject({ root, path: binary, version: '2.11.7', source: 'workspace' });
    });

    it.skipIf(!CAN_SYMLINK)('WHEN turbo and its platform package are pnpm store symlinks THEN the real binary is resolved', async () => {
      const root = await workspaceAt(join(tempDir, 'pnpm'));
      const store = join(root, 'node_modules', '.pnpm');
      const turboReal = join(store, 'turbo@2.11.7', 'node_modules', 'turbo');
      const storeName = SCOPED_PACKAGE.replace('/', '+');
      const platformReal = join(store, `${storeName}@2.11.7`, 'node_modules', SCOPED_PACKAGE);
      const binary = join(platformReal, 'bin', basename(SCOPED_BINARY));
      const platformLink = join(store, 'turbo@2.11.7', 'node_modules', SCOPED_PACKAGE);

      await writeFileIn(join(turboReal, 'package.json'), TURBO_MANIFEST);
      await writeFileIn(binary, '');
      await symlink(turboReal, join(root, 'node_modules', 'turbo'));
      await mkdir(dirname(platformLink), { recursive: true });
      await symlink(platformReal, platformLink);

      const resolved = await resolveTurbo(root, TRUSTED);

      expect(resolved).toMatchObject({ root, path: binary, source: 'workspace' });
    });

    it('WHEN the scoped binary path is a directory and the legacy one a file THEN the legacy binary is resolved', async () => {
      const root = await workspaceAt(join(tempDir, 'legacy'), TURBO_MANIFEST);
      const legacy = join(root, 'node_modules', LEGACY_BINARY);

      await mkdir(join(root, 'node_modules', SCOPED_BINARY), { recursive: true });
      await writeFileIn(legacy, '');

      const resolved = await resolveTurbo(root, TRUSTED);

      expect(resolved).toMatchObject({ path: legacy, source: 'workspace' });
    });

    it('WHEN a legacy binary sits in a nearer lookup dir and the scoped one in the root node_modules THEN the scoped binary is resolved', async () => {
      const root = await workspaceAt(join(tempDir, 'scoped-first'), TURBO_MANIFEST);
      const nodeModules = join(root, 'node_modules');
      const nearerLegacy = join(nodeModules, 'turbo', 'node_modules', LEGACY_BINARY);

      await writeFileIn(nearerLegacy, '');
      const scoped = await installPlatformBinary(nodeModules);

      const resolved = await resolveTurbo(root, TRUSTED);

      expect(resolved).toMatchObject({ path: scoped, source: 'workspace' });
    });

    it('WHEN turbo has no platform package THEN it rejects not-found naming the root node_modules and overridePath', async () => {
      const root = await workspaceAt(join(tempDir, 'no-platform'), TURBO_MANIFEST);

      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found', message: noBinaryMessage(root) });
    });

    it('WHEN the platform package is installed only in a parent folder of the root THEN it rejects not-found', async () => {
      await installPlatformBinary(join(tempDir, 'parent', 'node_modules'));
      const root = await workspaceAt(join(tempDir, 'parent', 'repo'), TURBO_MANIFEST);

      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found', message: noBinaryMessage(root) });
    });

    it.skipIf(!CAN_SYMLINK)('WHEN only a parent folder links the platform package into the root THEN it rejects not-found', async () => {
      const root = await workspaceAt(join(tempDir, 'linked-parent', 'repo'), TURBO_MANIFEST);
      const stashed = join(root, 'node_modules', '.stash', 'platform');
      const parentLink = join(tempDir, 'linked-parent', 'node_modules', SCOPED_PACKAGE);

      await writeFileIn(join(stashed, 'bin', basename(SCOPED_BINARY)), '');
      await mkdir(dirname(parentLink), { recursive: true });
      await symlink(stashed, parentLink);

      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found' });
    });

    it.skipIf(!CAN_SYMLINK)('WHEN the root platform package links to a folder outside the root THEN it rejects not-found', async () => {
      const root = await workspaceAt(join(tempDir, 'linked-out', 'repo'), TURBO_MANIFEST);
      const outside = join(tempDir, 'linked-out', 'elsewhere');
      const rootLink = join(root, 'node_modules', SCOPED_PACKAGE);

      await writeFileIn(join(outside, 'bin', basename(SCOPED_BINARY)), '');
      await mkdir(dirname(rootLink), { recursive: true });
      await symlink(outside, rootLink);

      const error = await rejectionOf(root);

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found' });
    });

    describe('GIVEN NODE_PATH points at a folder holding the platform package', () => {
      const previous = process.env[NODE_PATH];
      let globalDir = '';

      beforeAll(async () => {
        globalDir = join(tempDir, 'global');
        await installPlatformBinary(globalDir);
        process.env[NODE_PATH] = globalDir;
        reloadGlobalPaths();
      });

      afterAll(() => {
        if (previous === undefined) Reflect.deleteProperty(process.env, NODE_PATH);
        else process.env[NODE_PATH] = previous;
        reloadGlobalPaths();
      });

      it('WHEN a root with turbo but no platform package is resolved THEN it rejects not-found', async () => {
        const root = await workspaceAt(join(tempDir, 'plain'), TURBO_MANIFEST);
        const fromManifest = createRequire(manifestPathOf(root));
        const lookup = fromManifest.resolve.paths('turbo');

        const error = await rejectionOf(root);

        expect(lookup).toContain(globalDir);
        expect(error).toBeInstanceOf(TurboException);
        expect(error).toMatchObject({ kind: 'not-found', message: noBinaryMessage(root) });
      });
    });
  });
});
