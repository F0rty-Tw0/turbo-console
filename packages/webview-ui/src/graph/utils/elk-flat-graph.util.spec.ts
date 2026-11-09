import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { flatElkGraphOf } from './elk-flat-graph.util.ts';
import { elkGraphOf } from './elk-graph.util.ts';
import { titledRowOf } from './task-compound.util.ts';
import { BOARDS_SIZE_STUB } from '../test/stubs/folder-boards.stub.ts';
import { PACKED_EDGES_STUB, PACKED_GRAPH_STUB } from '../test/stubs/packed-graph.stub.ts';
import { boardsGraphOf, boardsSizeOf, childrenOf, idsOf } from '../test/utils/folder-boards.spec.util.ts';

describe('FEATURE: flatElkGraphOf', () => {
  describe('GIVEN the grouped boards graph', () => {
    const grouped = boardsGraphOf();

    it('WHEN flattened THEN the children are the five package leaves in order', () => {
      const flat = flatElkGraphOf(grouped);
      const [first] = childrenOf(flat);

      expect(idsOf(childrenOf(flat))).toStrictEqual(['docs', 'web', '@acme/config', '@acme/ui', '@acme/utils']);
      expect(first).toStrictEqual({ id: 'docs', ...BOARDS_SIZE_STUB });
    });

    it('WHEN flattened THEN the root keeps its edges, options and id', () => {
      const flat = flatElkGraphOf(grouped);

      expect(flat.edges).toStrictEqual(grouped.edges);
      expect(flat.layoutOptions).toStrictEqual(grouped.layoutOptions);
      expect(flat.id).toBe('root');
    });

    it('WHEN flattened THEN no compound id remains', () => {
      const flat = flatElkGraphOf(grouped);
      const ids = idsOf(childrenOf(flat));
      const compoundIds = ids.filter((id) => id.startsWith('\u0001'));

      expect(compoundIds).toStrictEqual([]);
    });
  });

  it('GIVEN an already flat graph WHEN flattened THEN it comes back equal', () => {
    const flat = elkGraphOf(['a', 'b'], [{ source: 'a', target: 'b' }], boardsSizeOf);

    const flattened = flatElkGraphOf(flat);

    expect(flattened).toStrictEqual(flat);
  });

  it('GIVEN an empty graph WHEN flattened THEN it has no children', () => {
    const empty = elkGraphOf([], [], boardsSizeOf);

    const flattened = flatElkGraphOf(empty);

    expect(flattened.children).toStrictEqual([]);
  });

  describe('GIVEN a packed graph with edges at three depths', () => {
    it('WHEN flattened THEN every edge is kept, the root edge first and the rest depth-first', () => {
      const flat = flatElkGraphOf(PACKED_GRAPH_STUB);

      expect(flat.edges).toStrictEqual(PACKED_EDGES_STUB);
    });

    it('WHEN flattened THEN the children are the four leaves and no wrapper id remains', () => {
      const flat = flatElkGraphOf(PACKED_GRAPH_STUB);

      expect(idsOf(childrenOf(flat))).toStrictEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('GIVEN a root holding a titled-row box and a link', () => {
    const leaf: ElkNode = { id: 'api#build', width: 80, height: 32 };
    const link: ElkEdge = { id: 'api>web', sources: ['api#build'], targets: ['web#build'] };
    const web: ElkNode = { id: 'web#build', width: 80, height: 32 };
    const graph: ElkNode = { id: 'root', children: [titledRowOf('api', leaf, 60, {}), web], edges: [link] };

    it('WHEN flattened THEN it holds no title slot leaf and no title tie edge', () => {
      const flat = flatElkGraphOf(graph);

      expect(idsOf(childrenOf(flat))).toStrictEqual(['api#build', 'web#build']);
      expect(flat.edges).toStrictEqual([link]);
    });
  });
});
