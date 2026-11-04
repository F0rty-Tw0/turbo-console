import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { elkGraphOf } from './elk-graph.util.ts';
import { packComponentsOf } from './elk-pack.util.ts';
import { LAYERING_DEFAULT } from '../common/graph-layout.const.ts';
import { optionValuesOf, sizeOf } from '../test/utils/elk-options.spec.util.ts';
import {
  PACK_LEAF_COUNT,
  compoundNodeOf,
  expectedWrapperOptionsOf,
  leafNodeOf,
  linkOf,
  packRootOf,
  packedRootOptionsOf,
  wrapperEdgesOf,
  wrapperIdOf,
  wrapperMemberIdsOf
} from '../test/utils/elk-pack.spec.util.ts';
import { childrenOf, idsOf } from '../test/utils/folder-boards.spec.util.ts';

const firstCodePointOf = (id: string): number | undefined => id.codePointAt(0);

const codePointsOf = (ids: string[]): (number | undefined)[] => ids.map(firstCodePointOf);

const PACKED_OPTIONS = packedRootOptionsOf(PACK_LEAF_COUNT, LAYERING_DEFAULT);

const WRAPPER_OPTIONS = expectedWrapperOptionsOf(PACK_LEAF_COUNT, LAYERING_DEFAULT);

const FOLDER_A = compoundNodeOf('A', [leafNodeOf('a1'), leafNodeOf('a2')]);

const FOLDER_B = compoundNodeOf('B', [leafNodeOf('b1')]);

const FOLDER_C = compoundNodeOf('C', [leafNodeOf('c1')]);

const A1_B1 = linkOf('a1', 'b1');

describe('FEATURE: packComponentsOf', () => {
  describe('GIVEN a flat root without INCLUDE_CHILDREN and two components', () => {
    it('WHEN packed THEN it comes back unchanged', () => {
      const flat = elkGraphOf(['a', 'b'], [], sizeOf);

      const packed = packComponentsOf(flat);

      expect(packed).toBe(flat);
    });
  });

  describe('GIVEN one component', () => {
    it('WHEN packed THEN it comes back unchanged', () => {
      const root = packRootOf([FOLDER_A, FOLDER_B], [A1_B1]);

      const packed = packComponentsOf(root);

      expect(packed).toBe(root);
    });
  });

  describe('GIVEN folders A (a1, a2), B (b1) and C (c1) and the edge a1 > b1', () => {
    it('WHEN packed THEN the wrappers are [A, B] and [C], the edge in the first, under a rectpacking root', () => {
      const root = packRootOf([FOLDER_A, FOLDER_B, FOLDER_C], [A1_B1]);
      const first: ElkNode = { id: wrapperIdOf(0), layoutOptions: WRAPPER_OPTIONS, children: [FOLDER_A, FOLDER_B], edges: [A1_B1] };
      const second: ElkNode = { id: wrapperIdOf(1), layoutOptions: WRAPPER_OPTIONS, children: [FOLDER_C], edges: [] };
      const expected: ElkNode = { id: 'root', layoutOptions: PACKED_OPTIONS, children: [first, second], edges: [] };

      const packed = packComponentsOf(root);

      expect(packed).toStrictEqual(expected);
    });

    it('WHEN packed THEN the input is not changed', () => {
      const root = packRootOf([FOLDER_A, FOLDER_B, FOLDER_C], [A1_B1]);
      const before = structuredClone(root);

      packComponentsOf(root);

      expect(root).toStrictEqual(before);
    });

    it('WHEN packed THEN every wrapper id starts with U+0004', () => {
      const root = packRootOf([FOLDER_A, FOLDER_B, FOLDER_C], [A1_B1]);

      const packed = packComponentsOf(root);
      const ids = idsOf(childrenOf(packed));

      expect(ids).toStrictEqual([wrapperIdOf(0), wrapperIdOf(1)]);
      expect(codePointsOf(ids)).toStrictEqual([4, 4]);
    });
  });

  describe('GIVEN a script leaf three levels down linked to a leaf of another folder', () => {
    it('WHEN packed THEN both folders share one wrapper and the unlinked folder has its own', () => {
      const script = compoundNodeOf('scripts:web', [leafNodeOf('web#lint-fix')]);
      const web = compoundNodeOf('pkg:web', [script]);
      const apps = compoundNodeOf('apps', [web]);
      const packages = compoundNodeOf('packages', [compoundNodeOf('pkg:ui', [leafNodeOf('ui#build')])]);
      const tools = compoundNodeOf('tools', [compoundNodeOf('pkg:cli', [leafNodeOf('cli#build')])]);
      const root = packRootOf([apps, packages, tools], [linkOf('web#lint-fix', 'ui#build')]);

      const packed = packComponentsOf(root);

      expect(wrapperMemberIdsOf(packed)).toStrictEqual([['apps', 'packages'], ['tools']]);
    });
  });

  describe('GIVEN a LONGEST_PATH root with two components', () => {
    it('WHEN packed THEN every wrapper carries LONGEST_PATH, copied from the root', () => {
      const root = packRootOf([FOLDER_A, FOLDER_B], [], 'LONGEST_PATH');

      const packed = packComponentsOf(root);
      const layerings = optionValuesOf(packed, 'elk.layered.layering.strategy');

      expect(layerings).toStrictEqual(['LONGEST_PATH', 'LONGEST_PATH', 'LONGEST_PATH']);
    });
  });

  describe('GIVEN an edge whose target is not in the graph', () => {
    it('WHEN packed THEN it sits in its source wrapper and joins no components', () => {
      const dangling = linkOf('a1', 'missing');
      const root = packRootOf([FOLDER_A, FOLDER_B], [dangling]);

      const packed = packComponentsOf(root);

      expect(wrapperMemberIdsOf(packed)).toStrictEqual([['A'], ['B']]);
      expect(wrapperEdgesOf(packed)).toStrictEqual([[dangling], []]);
    });
  });

  describe('GIVEN an edge whose source is not in the graph', () => {
    it('WHEN packed THEN it is dropped and nothing throws', () => {
      const root = packRootOf([FOLDER_A, FOLDER_B], [linkOf('missing', 'a1')]);

      const packed = packComponentsOf(root);

      expect(wrapperMemberIdsOf(packed)).toStrictEqual([['A'], ['B']]);
      expect(wrapperEdgesOf(packed)).toStrictEqual([[], []]);
    });
  });
});
