import type { BigIntStats, Stats } from 'node:fs';
import type * as fsPromises from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import type { TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type { PackageManager } from '../common/workspace-model.type.ts';
import {
  NPM_BY_DEFAULT_STUB,
  PNPM_BY_LOCKFILE_STUB,
  YARN_BY_FIELD_STUB,
  YARN_BY_LOCKFILE_STUB
} from '../test/stubs/package-manager.stub.ts';
import { graphPackage, packageGraph } from '../test/utils/graph.spec.util.ts';
import { rootWithFiles } from '../test/utils/root-files.spec.util.ts';

const turbo = vi.hoisted(() => {
  const state = { stdout: '' };

  return state;
});

const spy = vi.hoisted(() => {
  const statPaths: string[] = [];
  const state = { statPaths, lstatCalls: 0 };

  return state;
});

vi.mock('../../shared/turbo/data-access/query-turbo.ts', () => {
  const queryTurbo = async (): Promise<TurboResult> => {
    const result: TurboResult = { stdout: turbo.stdout, stderr: '', exitCode: 0 };

    return Promise.resolve(result);
  };

  const mocked = { queryTurbo };

  return mocked;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  const stat = async (...args: Parameters<typeof real.stat>): Promise<BigIntStats | Stats> => {
    spy.statPaths.push(String(args[0]));

    return real.stat(...args);
  };

  const lstat = async (...args: Parameters<typeof real.lstat>): Promise<BigIntStats | Stats> => {
    spy.lstatCalls += 1;

    return real.lstat(...args);
  };

  const mocked = { ...real, stat, lstat };

  return mocked;
});

const GRAPH = packageGraph([graphPackage('a', 'packages/a', [], [])], []);

/** Each is no usable `packageManager` field, so the root's lockfile decides. */
const UNUSABLE_MANIFESTS: [string, string][] = [
  ['is not JSON', '{not json'],
  ['holds a number as its packageManager', '{"packageManager":42}'],
  ['holds an unknown manager', '{"packageManager":"deno@2"}']
];

let tempDir = '';

const binaryAt = (root: string): TurboBinary => new TurboBinary(root, join(root, 'turbo'), '2.11.7', 'override');

const packageManagerOf = async (files: Record<string, string>): Promise<PackageManager> => {
  const root = await rootWithFiles(tempDir, files);
  const model = await loadWorkspace(binaryAt(root));

  return model.packageManager;
};

describe('FEATURE: workspace loading package manager', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'load-package-manager-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    turbo.stdout = JSON.stringify(GRAPH);
    spy.statPaths.length = 0;
    spy.lstatCalls = 0;
  });

  describe('GIVEN a root package.json with a packageManager field', () => {
    it('WHEN a pnpm lockfile is also there THEN the field wins', async () => {
      const files = { 'package.json': '{"packageManager":"yarn@4"}', 'pnpm-lock.yaml': '' };

      const packageManager = await packageManagerOf(files);

      expect(packageManager).toStrictEqual(YARN_BY_FIELD_STUB);
    });
  });

  describe('GIVEN a root with no packageManager field', () => {
    it('WHEN pnpm-lock.yaml and yarn.lock are both there THEN pnpm wins by its lockfile', async () => {
      const files = { 'package.json': '{}', 'pnpm-lock.yaml': '', 'yarn.lock': '' };

      const packageManager = await packageManagerOf(files);

      expect(packageManager).toStrictEqual(PNPM_BY_LOCKFILE_STUB);
    });

    it('WHEN only a package holds a yarn.lock THEN it is npm by default', async () => {
      const files = { 'package.json': '{}', 'packages/a/package.json': '{}', 'packages/a/yarn.lock': '' };

      const packageManager = await packageManagerOf(files);

      expect(packageManager).toStrictEqual(NPM_BY_DEFAULT_STUB);
    });

    it('WHEN the root has no package.json at all THEN it is npm by default', async () => {
      const packageManager = await packageManagerOf({ 'turbo.json': '{"tasks":{}}' });

      expect(packageManager).toStrictEqual(NPM_BY_DEFAULT_STUB);
    });
  });

  describe('GIVEN a root package.json that gives no usable field', () => {
    it.each(UNUSABLE_MANIFESTS)('WHEN it %s THEN the load succeeds and the lockfile decides', async (_, text) => {
      const files = { 'package.json': text, 'yarn.lock': '' };

      const packageManager = await packageManagerOf(files);

      expect(packageManager).toStrictEqual(YARN_BY_LOCKFILE_STUB);
    });
  });

  describe('GIVEN a root with a lockfile', () => {
    it('WHEN loaded THEN stat runs only in the keyed-file hashes and lstat never', async () => {
      const files = { 'package.json': '{}', 'pnpm-lock.yaml': '' };
      const root = await rootWithFiles(tempDir, files);
      const lockfile = join(root, 'pnpm-lock.yaml');

      await loadWorkspace(binaryAt(root));

      const lockfileStats = spy.statPaths.filter((path) => path === lockfile);

      expect(lockfileStats).toHaveLength(2);
      expect(spy.lstatCalls).toBe(0);
    });
  });
});
