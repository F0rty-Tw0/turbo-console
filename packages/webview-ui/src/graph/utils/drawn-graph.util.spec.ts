import { describe, expect, it } from 'vitest';

import { drawnGraphOf } from './drawn-graph.util.ts';
import type { GraphEdge, GraphPackage, GraphReady } from '../../bridge/common/graph-state.type.ts';

const PACKAGES: GraphPackage[] = [
  { name: 'core', path: 'packages/core', tags: [] },
  { name: 'web', path: 'apps/web', tags: ['ui'] }
];

const KEPT_EDGE: GraphEdge = { source: 'web', target: 'core' };

const DANGLING_EDGE: GraphEdge = { source: 'web', target: 'ghost' };

const STATE: GraphReady = { kind: 'graph', hash: 'h', packages: PACKAGES, edges: [KEPT_EDGE, DANGLING_EDGE], positions: null };

describe('FEATURE: drawnGraphOf', () => {
  describe('GIVEN a ready state with an edge to a package no record names', () => {
    it('WHEN drawn THEN packages are the names, infos the records, and edges drop the dangling one', () => {
      const drawn = drawnGraphOf(STATE);

      expect(drawn).toStrictEqual({ hash: 'h', packages: ['core', 'web'], infos: PACKAGES, edges: [KEPT_EDGE] });
    });
  });
});
