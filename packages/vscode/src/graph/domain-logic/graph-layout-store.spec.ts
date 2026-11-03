import type { GraphState, Routes } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { layoutCachesOf, storePositions } from './graph-layout-store.ts';
import type { GraphLayoutCacheEntry, PositionsPost } from '../common/graph-cache.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import {
  EDGE_ROUTE_STUB,
  GRAPH_HASH_STUB,
  GRAPH_MODEL_STUB,
  GRAPH_PACKAGES_STUB,
  GRAPH_SHOWN_STUB,
  GRAPH_STATE_STUB,
  ROUTES_STUB
} from '../test/stubs/graph-model.stub.ts';
import { positionsOf } from '../test/utils/graph-session.spec.util.ts';
import { cacheKeyOf } from '../utils/graph-cache.util.ts';
import { graphStateOf } from '../utils/graph-state.util.ts';

const FLAT_ENTRY: GraphLayoutCacheEntry = {
  hash: GRAPH_HASH_STUB,
  positions: positionsOf(GRAPH_PACKAGES_STUB),
  routes: {}
};
const FOLDERS_ENTRY: GraphLayoutCacheEntry = { hash: 'ffffffff', positions: positionsOf(['a']), routes: {} };
const FULL_POSITIONS = positionsOf(GRAPH_PACKAGES_STUB);
const LOADING_STATE: GraphState = { kind: 'loading' };
const GHOST_ROUTES: Routes = { ghost: EDGE_ROUTE_STUB };
const MIXED_ROUTES: Routes = { ...ROUTES_STUB, ...GHOST_ROUTES };

const postOf = (overrides: Partial<PositionsPost>): PositionsPost => {
  const post: PositionsPost = { hash: GRAPH_HASH_STUB, positions: FULL_POSITIONS, routes: {}, grouping: 'flat', ...overrides };

  return post;
};

describe('FEATURE: graph layout store', () => {
  describe('GIVEN both layout caches seeded', () => {
    it('WHEN the caches are read THEN each grouping is read once and returned under its own name', () => {
      const seed = new Map([
        [cacheKeyOf('/ws', 'flat'), FLAT_ENTRY],
        [cacheKeyOf('/ws', 'folders'), FOLDERS_ENTRY]
      ]);
      const ports = graphPortsMock(seed);

      const caches = layoutCachesOf(ports, '/ws');

      expect(caches).toStrictEqual({ flat: FLAT_ENTRY, folders: FOLDERS_ENTRY });
      expect(ports.readCache).toHaveBeenCalledTimes(2);
      expect(ports.readCache).toHaveBeenCalledWith('/ws', 'flat');
      expect(ports.readCache).toHaveBeenCalledWith('/ws', 'folders');
    });
  });

  describe('GIVEN a graph state', () => {
    it.each([['flat'], ['folders']] as const)(
      'WHEN a current-hash post with every package has grouping %s THEN it is stored under that grouping and true is returned',
      (grouping) => {
        const ports = graphPortsMock();

        const isStored = storePositions(ports, '/ws', GRAPH_STATE_STUB, postOf({ grouping }));

        expect(isStored).toBe(true);
        expect(ports.writeCache).toHaveBeenCalledExactlyOnceWith('/ws', grouping, {
          hash: GRAPH_HASH_STUB,
          positions: FULL_POSITIONS,
          routes: {}
        });
      }
    );

    it('WHEN a post carries a known and an unknown edge route THEN writeCache gets only the known route', () => {
      const ports = graphPortsMock();

      storePositions(ports, '/ws', GRAPH_STATE_STUB, postOf({ routes: MIXED_ROUTES }));

      expect(ports.writeCache).toHaveBeenCalledExactlyOnceWith('/ws', 'flat', {
        hash: GRAPH_HASH_STUB,
        positions: FULL_POSITIONS,
        routes: ROUTES_STUB
      });
    });

    it('WHEN every route of the post is unknown THEN the positions are stored with routes {} and true is returned', () => {
      const ports = graphPortsMock();

      const isStored = storePositions(ports, '/ws', GRAPH_STATE_STUB, postOf({ routes: GHOST_ROUTES }));

      expect(isStored).toBe(true);
      expect(ports.writeCache).toHaveBeenCalledExactlyOnceWith('/ws', 'flat', {
        hash: GRAPH_HASH_STUB,
        positions: FULL_POSITIONS,
        routes: {}
      });
    });

    it.each([
      ['a stale hash', postOf({ hash: 'ffffffff' })],
      ['a missing package', postOf({ positions: positionsOf(['a', 'web']) })],
      ['an extra key', postOf({ positions: positionsOf([...GRAPH_PACKAGES_STUB, 'ghost']) })]
    ])('WHEN the post has %s THEN nothing is written and false is returned', (_label, post) => {
      const ports = graphPortsMock();

      const isStored = storePositions(ports, '/ws', GRAPH_STATE_STUB, post);

      expect(isStored).toBe(false);
      expect(ports.writeCache).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a state that is not a graph', () => {
    it('WHEN a post arrives THEN nothing is written and false is returned', () => {
      const ports = graphPortsMock();

      const isStored = storePositions(ports, '/ws', LOADING_STATE, postOf({}));

      expect(isStored).toBe(false);
      expect(ports.writeCache).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a post with routes stored under flat', () => {
    it('WHEN the state is built THEN routes carry them and folderRoutes is null', () => {
      const ports = graphPortsMock();

      storePositions(ports, '/ws', GRAPH_STATE_STUB, postOf({ routes: ROUTES_STUB, grouping: 'flat' }));
      const state = graphStateOf(GRAPH_MODEL_STUB, layoutCachesOf(ports, '/ws'), GRAPH_SHOWN_STUB);

      expect(state).toMatchObject({ positions: FULL_POSITIONS, routes: ROUTES_STUB, folderPositions: null, folderRoutes: null });
    });
  });

  describe('GIVEN a post with routes stored under folders', () => {
    it('WHEN the state is built THEN folderRoutes carry them and routes is null', () => {
      const ports = graphPortsMock();

      storePositions(ports, '/ws', GRAPH_STATE_STUB, postOf({ routes: ROUTES_STUB, grouping: 'folders' }));
      const state = graphStateOf(GRAPH_MODEL_STUB, layoutCachesOf(ports, '/ws'), GRAPH_SHOWN_STUB);

      expect(state).toMatchObject({ positions: null, routes: null, folderPositions: FULL_POSITIONS, folderRoutes: ROUTES_STUB });
    });
  });
});
