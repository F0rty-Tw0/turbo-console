import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readTurboConfig, readTurboConfigs } from './turbo-config.ts';
import type { TaskPresence, TurboConfigError, TurboConfigOk } from '../common/turbo-config.type.ts';

/** chmod has no effect on Windows, and root reads any file. */
const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

/** mkfifo, and opening a directory for reading, are POSIX only. */
const IS_POSIX = process.platform !== 'win32';

const BOTH_WARNING = 'both turbo.json and turbo.jsonc found; read turbo.json';

const MAX_CONFIG_BYTES = 1024 * 1024;

const NOT_SMALL_FILE: TurboConfigError = { path: 'turbo.json', error: 'not a regular file of at most 1 MiB' };

const BUILD_DESCRIPTIONS = { build: 'x' };

const BUILD_TASKS: Record<string, TaskPresence> = { build: 'defined' };

const DESCRIBED = '{"tasks":{"build":{"description":"x"}}}';

/** `C:` cannot start a file name on Windows, where the drive case reuses the root's own file as its decoy. */
const DRIVE_DECOY = IS_POSIX ? 'root/C:/x/turbo.json' : 'root/turbo.json';

/** Each dir, a workspace name, and the file (relative to the workspace's parent) the dir would reach from `root`. */
const ESCAPING_DIRS: [string, string, string][] = [
  ['../x', 'parent', 'x/turbo.json'],
  ['/abs', 'absolute', 'root/abs/turbo.json'],
  ['a/../../b', 'inner-parent', 'b/turbo.json'],
  ['C:/x', 'drive', DRIVE_DECOY]
];

let tempDir = '';

/** A new workspace root holding `files` (relative path → text). */
const workspaceWith = async (name: string, files: Record<string, string>): Promise<string> => {
  const root = join(tempDir, name);

  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }

  await mkdir(root, { recursive: true });

  return root;
};

/** Trailing spaces keep it valid JSON, so only the size bound can reject it. */
const padded = (bytes: number): string => `${DESCRIBED}${' '.repeat(bytes - DESCRIBED.length)}`;

const okConfig = (path: string): TurboConfigOk => {
  const config: TurboConfigOk = {
    path,
    descriptions: BUILD_DESCRIPTIONS,
    tasks: BUILD_TASKS,
    persistent: {},
    extends: [],
    affectedUsingTaskInputs: false
  };

  return config;
};

describe('FEATURE: turbo.json(c) reading', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'turbo-config-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a root with only turbo.jsonc', () => {
    it('WHEN the configs are read THEN the one entry has path turbo.jsonc', async () => {
      const root = await workspaceWith('jsonc-only', { 'turbo.jsonc': `// root\n${DESCRIBED}` });

      const configs = await readTurboConfigs(root, []);

      expect(configs).toStrictEqual([okConfig('turbo.jsonc')]);
    });
  });

  describe('GIVEN a directory with both turbo.json and turbo.jsonc', () => {
    it('WHEN it is read THEN turbo.json is used with a warning', async () => {
      const root = await workspaceWith('both', { 'turbo.json': DESCRIBED, 'turbo.jsonc': '{}' });
      const parsed = okConfig('turbo.json');
      const expected: TurboConfigOk = { ...parsed, warning: BOTH_WARNING };

      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(expected);
    });

    it('WHEN turbo.json does not parse THEN its error is returned without the warning', async () => {
      const root = await workspaceWith('both-broken', { 'turbo.json': '{', 'turbo.jsonc': DESCRIBED });
      const expected: TurboConfigError = { path: 'turbo.json', error: 'CloseBraceExpected at 1' };

      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(expected);
    });
  });

  describe('GIVEN a turbo.json that is not a regular file of at most 1 MiB', () => {
    it.skipIf(!IS_POSIX)('WHEN it is a FIFO THEN it is an error entry instead of blocking on the read', async () => {
      const root = await workspaceWith('fifo', {});

      execFileSync('mkfifo', [join(root, 'turbo.json')]);
      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(NOT_SMALL_FILE);
    });

    it.skipIf(!IS_POSIX)('WHEN it is a directory THEN it is an error entry', async () => {
      const root = await workspaceWith('directory', {});

      await mkdir(join(root, 'turbo.json'));
      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(NOT_SMALL_FILE);
    });

    it('WHEN it is one byte over 1 MiB THEN it is an error entry without parsing it', async () => {
      const root = await workspaceWith('over', { 'turbo.json': padded(MAX_CONFIG_BYTES + 1) });

      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(NOT_SMALL_FILE);
    });

    it.skipIf(!IS_POSIX)('WHEN turbo.jsonc also exists THEN the turbo.json error entry is returned without the warning', async () => {
      const root = await workspaceWith('directory-both', { 'turbo.jsonc': DESCRIBED });

      await mkdir(join(root, 'turbo.json'));
      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(NOT_SMALL_FILE);
    });
  });

  describe('GIVEN a turbo.json of exactly 1 MiB', () => {
    it('WHEN it is read THEN it parses', async () => {
      const root = await workspaceWith('exact', { 'turbo.json': padded(MAX_CONFIG_BYTES) });

      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(okConfig('turbo.json'));
    });
  });

  describe('GIVEN a package directory with neither file', () => {
    it('WHEN it is read THEN the result is null', async () => {
      const root = await workspaceWith('neither', { 'packages/a/package.json': '{}' });

      const config = await readTurboConfig(root, 'packages/a');

      expect(config).toBeNull();
    });

    it('WHEN the configs are read THEN it has no entry', async () => {
      const root = await workspaceWith('neither-list', { 'packages/a/package.json': '{}' });

      const configs = await readTurboConfigs(root, ['packages/a']);

      expect(configs).toStrictEqual([]);
    });
  });

  describe('GIVEN a package directory path that runs through a regular file', () => {
    it('WHEN it is read THEN the result is null', async () => {
      const root = await workspaceWith('not-dir', { 'packages/a': '' });

      const config = await readTurboConfig(root, 'packages/a');

      expect(config).toBeNull();
    });
  });

  describe('GIVEN dirs that name the root', () => {
    it('WHEN the configs are read THEN the root config is listed once', async () => {
      const root = await workspaceWith('root-dirs', { 'turbo.json': DESCRIBED });

      const configs = await readTurboConfigs(root, ['', '.']);

      expect(configs).toStrictEqual([okConfig('turbo.json')]);
    });
  });

  describe('GIVEN a dir that leaves the root or is absolute, beside a turbo.json it would reach', () => {
    it.each(ESCAPING_DIRS)('WHEN %s is listed THEN only the root config is read', async (dir, name, decoy) => {
      const base = await workspaceWith(`escape-${name}`, { 'root/turbo.json': DESCRIBED, [decoy]: DESCRIBED });

      const configs = await readTurboConfigs(join(base, 'root'), [dir]);

      expect(configs).toStrictEqual([okConfig('turbo.json')]);
    });
  });

  describe('GIVEN configs in the root and two package directories', () => {
    it('WHEN the configs are read THEN they are sorted by path', async () => {
      const files = { 'turbo.json': DESCRIBED, 'packages/b/turbo.jsonc': DESCRIBED, 'packages/a/turbo.json': DESCRIBED };
      const root = await workspaceWith('sorted', files);
      const expected = [okConfig('packages/a/turbo.json'), okConfig('packages/b/turbo.jsonc'), okConfig('turbo.json')];

      const configs = await readTurboConfigs(root, ['packages/b', 'packages/a']);

      expect(configs).toStrictEqual(expected);
    });
  });

  describe.skipIf(!CAN_DENY_READ)('GIVEN an unreadable turbo.json', () => {
    let root = '';

    beforeAll(async () => {
      root = await workspaceWith('unreadable', { 'turbo.json': DESCRIBED });
      await chmod(join(root, 'turbo.json'), 0o000);
    });

    afterAll(async () => {
      await chmod(join(root, 'turbo.json'), 0o600);
    });

    it('WHEN it is read THEN it rejects io naming the file', async () => {
      const read = readTurboConfig(root, '');

      await expect(read).rejects.toMatchObject({ kind: 'io', message: `${join(root, 'turbo.json')}: EACCES` });
    });
  });

  describe.skipIf(!CAN_DENY_READ)('GIVEN a parsed turbo.json beside an unreadable turbo.jsonc', () => {
    let root = '';

    beforeAll(async () => {
      root = await workspaceWith('unreadable-jsonc', { 'turbo.json': DESCRIBED, 'turbo.jsonc': DESCRIBED });
      await chmod(join(root, 'turbo.jsonc'), 0o000);
    });

    afterAll(async () => {
      await chmod(join(root, 'turbo.jsonc'), 0o600);
    });

    it('WHEN it is read THEN turbo.json is used with the warning, turbo.jsonc never read', async () => {
      const parsed = okConfig('turbo.json');
      const expected: TurboConfigOk = { ...parsed, warning: BOTH_WARNING };

      const config = await readTurboConfig(root, '');

      expect(config).toStrictEqual(expected);
    });
  });

  describe.skipIf(!IS_POSIX)('GIVEN a parsed turbo.json beside a turbo.jsonc symlink to itself', () => {
    it('WHEN it is read THEN it rejects io naming turbo.jsonc', async () => {
      const root = await workspaceWith('looped-jsonc', { 'turbo.json': DESCRIBED });

      await symlink('turbo.jsonc', join(root, 'turbo.jsonc'));

      const read = readTurboConfig(root, '');

      await expect(read).rejects.toMatchObject({ kind: 'io', message: `${join(root, 'turbo.jsonc')}: ELOOP` });
    });
  });
});
