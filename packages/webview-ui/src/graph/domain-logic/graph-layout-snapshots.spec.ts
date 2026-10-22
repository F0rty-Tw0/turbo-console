import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayoutSnapshots } from './graph-layout-snapshots.ts';
import { DRAGGED_POSITIONS_STUB, FLAT_POSITIONS_STUB, GROUPED_POSITIONS_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';

describe('FEATURE: GraphLayoutSnapshots', () => {
  let snapshots: GraphLayoutSnapshots;

  beforeEach(() => {
    snapshots = new GraphLayoutSnapshots();
  });

  describe('GIVEN the flat cache seeded and the grouped cache missed', () => {
    beforeEach(() => {
      snapshots.seed('flat', FLAT_POSITIONS_STUB);
      snapshots.seed('folders', null);
    });

    it('THEN flat holds the cached positions from the cache engine', () => {
      expect(snapshots.has('flat')).toBe(true);
      expect(snapshots.positionsOf('flat')).toStrictEqual(FLAT_POSITIONS_STUB);
      expect(snapshots.engineOf('flat')).toBe('cache');
    });

    it('THEN folders holds nothing', () => {
      expect(snapshots.has('folders')).toBe(false);
      expect(snapshots.positionsOf('folders')).toBeUndefined();
      expect(snapshots.engineOf('folders')).toBeNull();
    });

    it('WHEN they are cleared THEN flat holds nothing', () => {
      snapshots.clear();

      expect(snapshots.has('flat')).toBe(false);
      expect(snapshots.engineOf('flat')).toBeNull();
    });
  });

  describe('GIVEN a grouped layout that fell back', () => {
    beforeEach(() => {
      snapshots.keep('folders', resultOf('h1', GROUPED_POSITIONS_STUB, 'fallback'));
    });

    it('THEN folders holds its positions from the fallback engine', () => {
      expect(snapshots.positionsOf('folders')).toStrictEqual(GROUPED_POSITIONS_STUB);
      expect(snapshots.engineOf('folders')).toBe('fallback');
    });

    it('WHEN it is dragged THEN the positions move and the engine stays fallback', () => {
      snapshots.drag('folders', DRAGGED_POSITIONS_STUB);

      expect(snapshots.positionsOf('folders')).toStrictEqual(DRAGGED_POSITIONS_STUB);
      expect(snapshots.engineOf('folders')).toBe('fallback');
    });
  });
});
