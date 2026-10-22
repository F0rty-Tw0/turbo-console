import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { layoutCachesOf, storePositions } from './graph-layout-store.ts';
import type { GraphLayoutCacheEntry, PositionsPost } from '../common/graph-cache.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_HASH_STUB, GRAPH_PACKAGES_STUB, GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';
import { positionsOf } from '../test/utils/graph-session.spec.util.ts';
import { cacheKeyOf } from '../utils/graph-cache.util.ts';

const FLAT_ENTRY: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: positionsOf(GRAPH_PACKAGES_STUB) };
const FOLDERS_ENTRY: GraphLayoutCacheEntry = { hash: 'ffffffff', positions: positionsOf(['a']) };
const FULL_POSITIONS = positionsOf(GRAPH_PACKAGES_STUB);
const LOADING_STATE: GraphState = { kind: 'loading' };

const postOf = (overrides: Partial<PositionsPost>): PositionsPost => {
  const post: PositionsPost = { hash: GRAPH_HASH_STUB, positions: FULL_POSITIONS, grouping: 'flat', ...overrides };

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
          positions: FULL_POSITIONS
        });
      }
    );

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
});
