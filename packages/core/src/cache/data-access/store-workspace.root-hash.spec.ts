import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hashKeyedFiles } from './keyed-files.ts';
import { storeWorkspace } from './store-workspace.ts';
import { getMemoryEntry } from './workspace-memory.ts';
import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';
import { graphPackage } from '../../workspace/test/utils/graph.spec.util.ts';
import { ROOT_KEYED_FILES } from '../common/cache.const.ts';
import type { SpawnMark } from '../common/cache.type.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';
import { backdateTree } from '../test/utils/backdate.spec.util.ts';
import { AGE_MS, newRoot } from '../test/utils/root-fixture.spec.util.ts';

const PACKAGES = [graphPackage('a', 'a', [], [])];

let tempDir = '';

const modelAt = (root: string): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, root };

  return model;
};

/** The mark `loadWorkspace` takes just before its spawn: now, and the root keyed files as they are. */
const markOf = async (root: string): Promise<SpawnMark> => {
  const rootFiles = await hashKeyedFiles(root, ROOT_KEYED_FILES);
  const mark: SpawnMark = { startedAt: Date.now(), rootFiles };

  return mark;
};

describe('FEATURE: workspace store root file check', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'store-root-hash-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a mark taken before the spawn', () => {
    it('WHEN no root file changed THEN the memory entry key is a string', async () => {
      const root = await newRoot(tempDir);
      const mark = await markOf(root);

      await storeWorkspace(modelAt(root), PACKAGES, mark, undefined);

      expect(typeof getMemoryEntry(root)?.key).toBe('string');
    });

    it('WHEN the root turbo.json was deleted THEN the memory entry key is null', async () => {
      const root = await newRoot(tempDir);
      const mark = await markOf(root);

      await rm(join(root, 'turbo.json'));
      await storeWorkspace(modelAt(root), PACKAGES, mark, undefined);

      expect(getMemoryEntry(root)?.key).toBeNull();
    });

    it('WHEN the root turbo.json changed and its mtime was put back THEN the memory entry key is null', async () => {
      const root = await newRoot(tempDir);
      const mark = await markOf(root);

      await writeFile(join(root, 'turbo.json'), '{"tasks":{"build":{}}}');
      await backdateTree(root, AGE_MS);
      await storeWorkspace(modelAt(root), PACKAGES, mark, undefined);

      expect(getMemoryEntry(root)?.key).toBeNull();
    });
  });
});
