import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { elkNodeCountOf } from './elk-node-count.util.ts';

const LEAF_A: ElkNode = { id: 'a', width: 10, height: 10 };

const LEAF_B: ElkNode = { id: 'b', width: 10, height: 10 };

const INNER: ElkNode = { id: 'inner', children: [LEAF_B] };

const OUTER: ElkNode = { id: 'outer', children: [LEAF_A, INNER] };

describe('FEATURE: elkNodeCountOf', () => {
  describe('GIVEN a root without children', () => {
    it('WHEN its nodes are counted THEN the count is 0', () => {
      expect(elkNodeCountOf({ id: 'root' })).toBe(0);
    });
  });

  describe('GIVEN a root holding a compound with a leaf and a nested compound of one leaf', () => {
    it('WHEN its nodes are counted THEN both compounds and both leaves count, the root does not', () => {
      expect(elkNodeCountOf({ id: 'root', children: [OUTER] })).toBe(4);
    });
  });
});
