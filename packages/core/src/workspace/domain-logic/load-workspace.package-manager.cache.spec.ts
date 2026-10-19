import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import type { TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import { PNPM_BY_DEV_ENGINES_STUB } from '../test/stubs/package-manager.stub.ts';
import { graphPackage, packageGraph } from '../test/utils/graph.spec.util.ts';
import { rootWithFiles } from '../test/utils/root-files.spec.util.ts';

const turbo = vi.hoisted(() => {
  const state = { stdout: '' };

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

const GRAPH = packageGraph([graphPackage('a', 'packages/a', [], [])], []);

const DEV_ENGINES_ONLY = '{"devEngines":{"packageManager":{"name":"pnpm"}}}';

let tempDir = '';

describe('FEATURE: package manager across a warm start', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'load-package-manager-cache-'));
    turbo.stdout = JSON.stringify(GRAPH);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a devEngines-only root loaded with a cache dir', () => {
    it('WHEN a fresh process reads the cache file THEN the cached model holds the same package manager', async () => {
      const root = await rootWithFiles(tempDir, { 'package.json': DEV_ENGINES_ONLY });
      const cacheDir = join(tempDir, 'cache');
      const binary = new TurboBinary(root, join(root, 'turbo'), '2.11.7', 'override');
      const loaded = await loadWorkspace(binary, { cacheDir });

      vi.resetModules();

      const { readCachedWorkspace } = await import('../../cache/domain-logic/read-cached-workspace.ts');
      const cached = await readCachedWorkspace(binary.root, cacheDir);

      expect(loaded.packageManager).toStrictEqual(PNPM_BY_DEV_ENGINES_STUB);
      expect(cached?.model.packageManager).toStrictEqual(loaded.packageManager);
    });
  });
});
