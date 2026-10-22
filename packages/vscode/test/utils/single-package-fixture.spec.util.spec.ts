import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FIXTURE_PACKAGE_MANAGER, PNPM_ENV_LOCKFILE } from '@turbo-console/repo-gen';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { initGit, writeEmptyWorkspace, writeSingleApp } from './single-package-fixture.spec.util.ts';
import { GIT_SPAWN_TIMEOUT_MS } from '../common/single-package.const.ts';

type Writer = (dir: string) => Promise<void>;

const WRITERS: [string, Writer][] = [
  ['writeSingleApp', writeSingleApp],
  ['writeEmptyWorkspace', writeEmptyWorkspace]
];

const SCRIPTS_SCHEMA = z.record(z.string(), z.string());

const TASKS_SCHEMA = z.record(z.string(), z.unknown());

const MANIFEST_SCHEMA = z.object({ name: z.string(), packageManager: z.string(), scripts: SCRIPTS_SCHEMA });

const TURBO_SCHEMA = z.object({ tasks: TASKS_SCHEMA });

const parsedFrom = async <T extends z.ZodType>(dir: string, name: string, schema: T): Promise<z.infer<T>> => {
  const text = await readFile(join(dir, name), 'utf8');
  const json: unknown = JSON.parse(text);

  return schema.parse(json);
};

const manifestOf = async (dir: string): Promise<z.infer<typeof MANIFEST_SCHEMA>> => parsedFrom(dir, 'package.json', MANIFEST_SCHEMA);

const turboOf = async (dir: string): Promise<z.infer<typeof TURBO_SCHEMA>> => parsedFrom(dir, 'turbo.json', TURBO_SCHEMA);

describe('FEATURE: single-package fixture writers', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'single-package-fixture-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe.each(WRITERS)('GIVEN %s', (_, write) => {
    it("WHEN it runs THEN the root package.json pins this repo's pnpm", async () => {
      await write(dir);

      const manifest = await manifestOf(dir);

      expect(manifest.packageManager).toBe(FIXTURE_PACKAGE_MANAGER);
    });

    it("WHEN it runs THEN pnpm-lock.yaml opens with pnpm's env lockfile, so pnpm never fetches itself", async () => {
      await write(dir);

      const lockfile = await readFile(join(dir, 'pnpm-lock.yaml'), 'utf8');

      expect(lockfile.startsWith(PNPM_ENV_LOCKFILE)).toBe(true);
    });

    it('WHEN it runs THEN .turbo is ignored', async () => {
      await write(dir);

      const ignored = await readFile(join(dir, '.gitignore'), 'utf8');

      expect(ignored).toContain('.turbo/');
    });
  });

  describe('GIVEN writeSingleApp', () => {
    it('WHEN it runs THEN the root holds the spec §2 fixture and no workspace file', async () => {
      await writeSingleApp(dir);

      const manifest = await manifestOf(dir);
      const { tasks } = await turboOf(dir);

      expect(manifest.name).toBe('single-app');
      expect(Object.keys(manifest.scripts)).toStrictEqual(['build', 'lint', 'dev', 'test:unit', 'format']);
      expect(Object.keys(tasks)).toStrictEqual(['build', 'lint', 'dev', 'test:unit']);
      expect(tasks['dev']).toStrictEqual({ persistent: true, cache: false });
      expect(tasks['test:unit']).toStrictEqual({ dependsOn: ['build'] });
      await expect(stat(join(dir, 'pnpm-workspace.yaml'))).rejects.toThrow();
    });
  });

  describe('GIVEN writeEmptyWorkspace', () => {
    it('WHEN it runs THEN workspaces are declared, none exist, and build is a bare key', async () => {
      await writeEmptyWorkspace(dir);

      const manifest = await manifestOf(dir);
      const turbo = await turboOf(dir);
      const workspaceYaml = await readFile(join(dir, 'pnpm-workspace.yaml'), 'utf8');
      const packages = await readdir(join(dir, 'packages'));

      expect(workspaceYaml).toContain('packages/*');
      expect(packages).toStrictEqual([]);
      expect(turbo.tasks).toStrictEqual({ build: {} });
      expect(Object.keys(manifest.scripts)).toStrictEqual(['build', 'lint']);
    });
  });

  describe('GIVEN a written fixture', () => {
    it(
      'WHEN initGit runs THEN the dir is a git repo',
      async () => {
        await writeSingleApp(dir);
        await initGit(dir);

        const head = await stat(join(dir, '.git', 'HEAD'));

        expect(head.isFile()).toBe(true);
      },
      GIT_SPAWN_TIMEOUT_MS
    );
  });
});
