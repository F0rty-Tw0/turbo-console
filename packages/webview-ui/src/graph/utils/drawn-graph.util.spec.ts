import { describe, expect, it } from 'vitest';

import { drawnGraphOf } from './drawn-graph.util.ts';
import type { GraphEdge, GraphPackage, GraphReady } from '../../bridge/common/graph-state.type.ts';

const PACKAGES: GraphPackage[] = [
  { name: 'core', bareName: 'core', path: 'packages/core', tags: [], taskCount: 0 },
  { name: 'web', bareName: 'web', path: 'apps/web', tags: ['ui'], taskCount: 0 }
];

const SCOPED: GraphPackage = { name: '@org/ui', bareName: 'ui', path: 'packages/ui', tags: [], taskCount: 0 };

const KEPT_EDGE: GraphEdge = { source: 'web', target: 'core' };

const DANGLING_EDGE: GraphEdge = { source: 'web', target: 'ghost' };

const STATE: GraphReady = {
  kind: 'graph',
  singlePackage: false,
  rootLabel: null,
  scopeShown: true,
  scriptsShown: true,
  predictionShown: false,
  affectedShown: false,
  hash: 'h',
  packages: PACKAGES,
  edges: [KEPT_EDGE, DANGLING_EDGE],
  positions: null,
  routes: null,
  folderRoutes: null,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};

describe('FEATURE: drawnGraphOf', () => {
  describe('GIVEN a ready state with an edge to a package no record names', () => {
    it('WHEN drawn THEN packages are the names, infos the records, edges drop the dangling one and each name labels itself', () => {
      const drawn = drawnGraphOf(STATE);

      expect(drawn).toStrictEqual({
        hash: 'h',
        packages: ['core', 'web'],
        infos: PACKAGES,
        edges: [KEPT_EDGE],
        scopeShown: true,
        labels: new Map([
          ['core', 'core'],
          ['web', 'web']
        ])
      });
    });
  });

  describe('GIVEN a ready state of a scoped package with scopes hidden', () => {
    it('WHEN drawn THEN scopes are hidden and the package is labelled by its bare name', () => {
      const state: GraphReady = { ...STATE, scopeShown: false, packages: [SCOPED], edges: [] };

      const drawn = drawnGraphOf(state);

      expect([drawn.scopeShown, [...drawn.labels]]).toStrictEqual([false, [['@org/ui', 'ui']]]);
    });
  });
});
