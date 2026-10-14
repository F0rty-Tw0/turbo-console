import { describe, expect, it } from 'vitest';

import { nodeFor, nodesOf, pruneNodes } from './node-cache.util.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { TREE_ROW_STUB } from '../test/stubs/tree-row.stub.ts';

const OTHER_ROW: TreeRow = { ...TREE_ROW_STUB, id: 'pkg:/ws\0b', key: 'b', packageName: 'b', label: 'b' };

const OTHER_ROOT_ROW: TreeRow = { ...TREE_ROW_STUB, id: 'pkg:/other\0a', root: '/other' };

describe('FEATURE: node cache', () => {
  describe('GIVEN an empty cache', () => {
    it('WHEN a row is seen THEN its node carries the row identity only', () => {
      const cache = new Map<string, TreeNode>();

      const node = nodeFor(cache, TREE_ROW_STUB);

      expect(node).toStrictEqual({ kind: 'pkg', id: 'pkg:/ws\0a', root: '/ws', key: 'a', packageName: 'a' });
    });

    it('WHEN two rows with the same id are seen THEN both get the same object', () => {
      const cache = new Map<string, TreeNode>();
      const relabelled: TreeRow = { ...TREE_ROW_STUB, label: 'renamed' };
      const first = nodeFor(cache, TREE_ROW_STUB);

      const second = nodeFor(cache, relabelled);

      expect(second).toBe(first);
    });

    it('WHEN a row with another id is seen THEN it gets a new object', () => {
      const cache = new Map<string, TreeNode>();
      const first = nodeFor(cache, TREE_ROW_STUB);

      const second = nodeFor(cache, OTHER_ROW);

      expect(second).not.toBe(first);
    });

    it('WHEN rows repeat an id THEN the nodes list it once, in row order', () => {
      const cache = new Map<string, TreeNode>();
      const rows = [TREE_ROW_STUB, OTHER_ROW, TREE_ROW_STUB];

      const nodes = nodesOf(cache, rows);
      const ids = nodes.map((node) => node.id);

      expect(ids).toStrictEqual(['pkg:/ws\0a', 'pkg:/ws\0b']);
    });
  });

  describe('GIVEN a cache holding two rows of a root and one of another root', () => {
    describe('WHEN that root is pruned keeping only one of its rows', () => {
      const prunedCache = (): Map<string, TreeNode> => {
        const cache = new Map<string, TreeNode>();
        const rows = [TREE_ROW_STUB, OTHER_ROW, OTHER_ROOT_ROW];
        const keep = new Set([TREE_ROW_STUB.id]);

        nodesOf(cache, rows);
        pruneNodes(cache, '/ws', keep);

        return cache;
      };

      it('THEN the gone id of that root is dropped', () => {
        const cache = prunedCache();

        const isCached = cache.has(OTHER_ROW.id);

        expect(isCached).toBe(false);
      });

      it('THEN the kept id stays', () => {
        const cache = prunedCache();

        const isCached = cache.has(TREE_ROW_STUB.id);

        expect(isCached).toBe(true);
      });

      it('THEN the other root keeps its id', () => {
        const cache = prunedCache();

        const isCached = cache.has(OTHER_ROOT_ROW.id);

        expect(isCached).toBe(true);
      });
    });
  });
});
