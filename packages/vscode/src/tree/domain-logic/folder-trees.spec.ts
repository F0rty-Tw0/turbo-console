import type { WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { FolderTrees } from './folder-trees.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { folderTree } from '../utils/folder-tree.util.ts';

describe('FEATURE: folder trees per model', () => {
  describe('GIVEN a model', () => {
    let trees: FolderTrees;

    beforeEach(() => {
      trees = new FolderTrees();
    });

    it('WHEN its tree is asked for THEN it is the folder tree of its packages', () => {
      const tree = trees.of(WORKSPACE_MODEL_STUB);

      expect(tree).toStrictEqual(folderTree(WORKSPACE_MODEL_STUB.packages));
    });

    it('WHEN its tree is asked for twice THEN both answers are the same object', () => {
      const first = trees.of(WORKSPACE_MODEL_STUB);
      const second = trees.of(WORKSPACE_MODEL_STUB);

      expect(second).toBe(first);
    });

    it('WHEN another model object is asked for THEN it gets its own tree', () => {
      const other: WorkspaceModel = { ...WORKSPACE_MODEL_STUB };
      const first = trees.of(WORKSPACE_MODEL_STUB);
      const second = trees.of(other);

      expect(second).not.toBe(first);
    });
  });
});
