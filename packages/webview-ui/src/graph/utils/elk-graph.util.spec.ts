import { describe, expect, it } from 'vitest';

import { elkGraphOf } from './elk-graph.util.ts';
import type { NodeSize } from '../common/node-size.type.ts';

const SIZE: NodeSize = { width: 100, height: 32 };

const sizeOf = (): NodeSize => SIZE;

describe('FEATURE: elkGraphOf', () => {
  describe('GIVEN two packages and one edge app > core', () => {
    const graph = elkGraphOf(['app', 'core'], [{ source: 'app', target: 'core' }], sizeOf);

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
      expect(graph.edges).toStrictEqual([{ id: 'app>core', sources: ['app'], targets: ['core'] }]);
    });
  });

  it('GIVEN no packages WHEN built THEN children and edges are empty arrays', () => {
    const graph = elkGraphOf([], [], sizeOf);

    expect(graph).toMatchObject({ id: 'root', children: [], edges: [] });
  });
});
