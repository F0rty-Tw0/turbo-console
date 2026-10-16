import type * as childProcess from 'node:child_process';
import { copyFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { TurboBinary } from '../index.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';

const spawns = vi.hoisted(() => {
  const state = { files: [] as string[] };

  return state;
});

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();
  const { recordingExecFile } = await import('../shared/turbo/test/utils/spawn-recorder.spec.util.ts');
  const mocked = { ...real, execFile: recordingExecFile(real.execFile, spawns.files) };

  return mocked;
});

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');

const TARGET_LIKE = PRESETS['target-like'];

const BINARY_NAME = process.platform === 'win32' ? 'turbo.exe' : 'turbo';

const BINARY_END = join('bin', BINARY_NAME);

const TRUSTED = { trusted: true } as const;

const turboSpawns = (path: string): number => spawns.files.filter((file) => file === path).length;

const rejectionOf = async (resolving: Promise<TurboBinary>): Promise<unknown> => resolving.catch((error: unknown) => error);

/** Core's own `turbo/package.json`, the package `devTurboPath()` and this repo's workspace binary both come from. */
const coreTurboManifest = async (): Promise<unknown> => {
  const manifestPath = createRequire(import.meta.url).resolve('turbo/package.json');
  const text = await readFile(manifestPath, 'utf8');

  return JSON.parse(text);
};

describe('FEATURE: turbo binary resolution', () => {
  beforeEach(() => {
    spawns.files.length = 0;
  });

  describe('GIVEN this repo as the workspace (W4)', () => {
    it('WHEN resolved without an override THEN the workspace platform binary and its package version are used with no spawn', async () => {
      const binary = await resolveTurbo(REPO_ROOT, TRUSTED);
      const manifest = await coreTurboManifest();
      const { path } = binary;

      expect(binary).toMatchObject({ root: REPO_ROOT, source: 'workspace' });
      expect(manifest).toMatchObject({ version: binary.version });
      expect(path.endsWith(BINARY_END)).toBe(true);
      expect(turboSpawns(path)).toBe(0);
    });

    it('WHEN the resolved binary runs --version THEN it prints the resolved version', async () => {
      const binary = await resolveTurbo(REPO_ROOT, TRUSTED);

      const result = await runTurbo(binary.path, ['--version'], REPO_ROOT);

      expect(result.stdout.trim()).toBe(binary.version);
    });

    it('WHEN an object literal is typed as TurboBinary THEN it does not compile', async () => {
      const binary = await resolveTurbo(REPO_ROOT, TRUSTED);
      // @ts-expect-error -- the #brand private field: no object literal satisfies TurboBinary.
      const forged: TurboBinary = { root: binary.root, path: binary.path, version: binary.version, source: 'workspace' };

      expect(forged).not.toBeInstanceOf(binary.constructor);
    });
  });

  describe('GIVEN a target-like fixture copy', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    const privateTurbo = (): string => join(fixture().dir, BINARY_NAME);

    beforeAll(async () => {
      // pnpm hard-links the store binary into every checkout; a link change elsewhere moves its ctime, which the override memo keys on.
      await copyFile(devTurboPath(), privateTurbo());
    });

    it('WHEN resolved twice with the dev turbo as override THEN it spawns --version once', async () => {
      vi.resetModules();
      // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
      const fresh = await import('../index.ts');
      const options = { trusted: true, overridePath: privateTurbo() } as const;
      const manifest = await coreTurboManifest();

      const first = await fresh.resolveTurbo(fixture().dir, options);
      const second = await fresh.resolveTurbo(fixture().dir, options);

      expect(first).toMatchObject({ root: fixture().dir, path: privateTurbo(), source: 'override' });
      expect(manifest).toMatchObject({ version: first.version });
      expect(second.version).toBe(first.version);
      expect(turboSpawns(privateTurbo())).toBe(1);
    });

    it('WHEN the same override is resolved again from a missing root THEN the memo hit still rejects io naming the root', async () => {
      vi.resetModules();
      // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
      const fresh = await import('../index.ts');
      const options = { trusted: true, overridePath: privateTurbo() } as const;
      const missingRoot = join(fixture().dir, 'no-such-dir');

      await fresh.resolveTurbo(fixture().dir, options);
      const error = await fresh.resolveTurbo(missingRoot, options).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(fresh.TurboException);
      expect(error).toMatchObject({ kind: 'io', message: `${missingRoot}: ENOENT` });
      expect(turboSpawns(privateTurbo())).toBe(1);
    });

    it('WHEN resolved without an override THEN it rejects not-found', async () => {
      const error = await rejectionOf(resolveTurbo(fixture().dir, TRUSTED));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found' });
    });

    it('WHEN the override path does not exist THEN it rejects not-found with no spawn', async () => {
      const overridePath = join(fixture().dir, 'nope');

      const error = await rejectionOf(resolveTurbo(fixture().dir, { trusted: true, overridePath }));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found' });
      expect(spawns.files).toStrictEqual([]);
    });

    it('WHEN the override path runs through a regular file THEN it rejects not-found with no spawn', async () => {
      const overridePath = join(fixture().dir, 'package.json', 'turbo');
      // Windows reports a path through a file as ERROR_PATH_NOT_FOUND, which libuv maps to ENOENT.
      const code = process.platform === 'win32' ? 'ENOENT' : 'ENOTDIR';

      const error = await rejectionOf(resolveTurbo(fixture().dir, { trusted: true, overridePath }));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found', message: `turbo override not found: ${overridePath}: ${code}` });
      expect(spawns.files).toStrictEqual([]);
    });

    it('WHEN the override path holds a NUL byte THEN it rejects invalid-argument with no spawn', async () => {
      const overridePath = `${devTurboPath()}\0x`;

      const error = await rejectionOf(resolveTurbo(fixture().dir, { trusted: true, overridePath }));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'invalid-argument' });
      expect(spawns.files).toStrictEqual([]);
    });

    it('WHEN the override path is relative THEN it rejects invalid-argument with no spawn', async () => {
      const overridePath = join('node_modules', '.bin', 'turbo');

      const error = await rejectionOf(resolveTurbo(fixture().dir, { trusted: true, overridePath }));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'invalid-argument', message: `turbo overridePath must be absolute: ${overridePath}` });
      expect(spawns.files).toStrictEqual([]);
    });
  });
});
