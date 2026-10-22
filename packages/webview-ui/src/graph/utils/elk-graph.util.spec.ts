import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { drawnGraphOf } from './drawn-graph.util.ts';
import { edgeIdOf } from './edge-id.util.ts';
import { elkGraphOf, layoutGraphOf } from './elk-graph.util.ts';
import { groupedElkGraphOf } from './elk-grouped-graph.util.ts';
import { folderGroupsOf } from './folder-group.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';

const SIZE: NodeSize = { width: 100, height: 32 };

const sizeOf = (): NodeSize => SIZE;

const APP_CORE: GraphEdge = { source: 'app', target: 'core' };

const A_B: GraphEdge = { source: 'a', target: 'b' };

const AB_C: GraphEdge = { source: 'a>b', target: 'c' };

const A_BC: GraphEdge = { source: 'a', target: 'b>c' };

const idOf = (element: ElkNode | ElkEdge): string => element.id;

const idsOf = (elements: ElkNode[] | ElkEdge[] | undefined): string[] => {
  const listed = elements ?? [];

  return listed.map(idOf);
};

describe('FEATURE: elkGraphOf', () => {
  describe('GIVEN two packages and one edge app > core', () => {
    const graph = elkGraphOf(['app', 'core'], [APP_CORE], sizeOf);

    it('THEN the root carries the layered, top-down, all-fast options', () => {
      expect(graph.layoutOptions).toStrictEqual({
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.layered.thoroughness': '1',
        'elk.layered.layering.strategy': 'LONGEST_PATH',
        'elk.layered.nodePlacement.strategy': 'SIMPLE',
        'elk.edgeRouting': 'POLYLINE'
      });
    });

    it('THEN each package is a sized child in package order', () => {
      expect(graph.children).toStrictEqual([
        { id: 'app', width: 100, height: 32 },
        { id: 'core', width: 100, height: 32 }
      ]);
    });

    it('THEN the edge runs from the dependent to the dependency', () => {
      expect(graph.edges).toStrictEqual([{ id: edgeIdOf(APP_CORE), sources: ['app'], targets: ['core'] }]);
    });
  });

  describe('GIVEN packages a, b and a>b, and one edge a > b', () => {
    const graph = elkGraphOf(['a', 'b', 'a>b'], [A_B], sizeOf);

    it('THEN there are 3 children and 1 edge', () => {
      expect(graph.children).toHaveLength(3);
      expect(graph.edges).toHaveLength(1);
    });

    it('THEN the edge id is no child id', () => {
      const childIds = idsOf(graph.children);
      const [edgeId] = idsOf(graph.edges);

      expect(childIds).not.toContain(edgeId);
    });
  });

  it('GIVEN the edges a>b > c and a > b>c WHEN built THEN their ids differ', () => {
    const graph = elkGraphOf(['a', 'a>b', 'b>c', 'c'], [AB_C, A_BC], sizeOf);

    const edgeIds = new Set(idsOf(graph.edges));

    expect(edgeIds.size).toBe(2);
  });

  it('GIVEN no packages WHEN built THEN children and edges are empty arrays', () => {
    const graph = elkGraphOf([], [], sizeOf);

    expect(graph).toMatchObject({ id: 'root', children: [], edges: [] });
  });
});

describe('FEATURE: layoutGraphOf', () => {
  describe('GIVEN the drawn graph of web in apps, ui and core in packages', () => {
    const drawn = drawnGraphOf(STATE_STUB);

    it('WHEN built flat THEN it is the flat ELK input', () => {
      const graph = layoutGraphOf(drawn, 'flat', sizeOf);

      expect(graph).toStrictEqual(elkGraphOf(drawn.packages, drawn.edges, sizeOf));
    });

    it('WHEN built grouped THEN it is the grouped ELK input of its folders', () => {
      const groups = folderGroupsOf(drawn.infos);

      const graph = layoutGraphOf(drawn, 'folders', sizeOf);

      expect(graph).toStrictEqual(groupedElkGraphOf(groups, drawn.edges, sizeOf));
    });
  });
});
