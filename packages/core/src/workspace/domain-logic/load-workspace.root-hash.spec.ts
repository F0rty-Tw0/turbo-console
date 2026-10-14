import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import { getMemoryEntry } from '../../cache/data-access/workspace-memory.ts';
import { newRoot } from '../../cache/test/utils/root-fixture.spec.util.ts';
import type { TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import { graphPackage, packageGraph } from '../test/utils/graph.spec.util.ts';

const turbo = vi.hoisted(() => {
  const proceed = async (): Promise<void> => Promise.resolve();
  const state = { stdout: '', onQuery: proceed };

  return state;
});

vi.mock('../../shared/turbo/data-access/query-turbo.ts', () => {
  const queryTurbo = async (): Promise<TurboResult> => {
    const result: TurboResult = { stdout: turbo.stdout, stderr: '', exitCode: 0 };

    await turbo.onQuery();

    return result;
  };

  const mocked = { queryTurbo };

  return mocked;
});

const GRAPH = packageGraph([graphPackage('a', 'a', [], [])], []);

let tempDir = '';

const binaryAt = (root: string): TurboBinary => new TurboBinary(root, join(root, 'turbo'), '2.11.7', 'override');

describe('FEATURE: workspace loading root file check', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'load-root-hash-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    turbo.stdout = JSON.stringify(GRAPH);
  });

  describe('GIVEN a root whose keyed files stay as they were during the query', () => {
    it('WHEN loaded THEN the memory entry key is a string', async () => {
      const root = await newRoot(tempDir);

      turbo.onQuery = async (): Promise<void> => Promise.resolve();

      await loadWorkspace(binaryAt(root));

      expect(typeof getMemoryEntry(root)?.key).toBe('string');
    });
  });

  describe('GIVEN a root turbo.json deleted during the query', () => {
    it('WHEN loaded THEN the memory entry key is null', async () => {
      const root = await newRoot(tempDir);

      turbo.onQuery = async (): Promise<void> => rm(join(root, 'turbo.json'));

      await loadWorkspace(binaryAt(root));

      expect(getMemoryEntry(root)?.key).toBeNull();
    });
  });
});
