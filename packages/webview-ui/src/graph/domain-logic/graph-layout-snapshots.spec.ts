import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayoutSnapshots } from './graph-layout-snapshots.ts';
import type { EdgeRoute, Routes } from '../../bridge/common/graph-state.type.ts';
import { DRAGGED_POSITIONS_STUB, FLAT_POSITIONS_STUB, GROUPED_POSITIONS_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { routeWithBends } from '../test/utils/route-bends.spec.util.ts';

const AB_ROUTE: EdgeRoute = routeWithBends(1);

const BC_ROUTE: EdgeRoute = routeWithBends(2);

const ROUTES: Routes = { 'a>b': AB_ROUTE, 'b>c': BC_ROUTE };

describe('FEATURE: GraphLayoutSnapshots', () => {
  let snapshots: GraphLayoutSnapshots;

  beforeEach(() => {
    snapshots = new GraphLayoutSnapshots();
  });

  describe('GIVEN the flat cache seeded and the grouped cache missed', () => {
    beforeEach(() => {
      snapshots.seed('flat', FLAT_POSITIONS_STUB, ROUTES);
      snapshots.seed('folders', null, null);
    });

    it('THEN flat holds the cached positions from the cache engine', () => {
      expect(snapshots.has('flat')).toBe(true);
      expect(snapshots.positionsOf('flat')).toStrictEqual(FLAT_POSITIONS_STUB);
      expect(snapshots.engineOf('flat')).toBe('cache');
      expect(snapshots.routesOf('flat')).toStrictEqual(ROUTES);
    });

    it('WHEN flat is dragged with b>c touched THEN its routes keep only a>b', () => {
      snapshots.drag('flat', DRAGGED_POSITIONS_STUB, ['b>c']);

      expect(snapshots.positionsOf('flat')).toStrictEqual(DRAGGED_POSITIONS_STUB);
      expect(snapshots.routesOf('flat')).toStrictEqual({ 'a>b': AB_ROUTE });
    });

    it('THEN folders holds nothing', () => {
      expect(snapshots.has('folders')).toBe(false);
      expect(snapshots.positionsOf('folders')).toBeUndefined();
      expect(snapshots.engineOf('folders')).toBeNull();
      expect(snapshots.routesOf('folders')).toStrictEqual({});
    });

    it('WHEN they are cleared THEN flat holds nothing', () => {
      snapshots.clear();

      expect(snapshots.has('flat')).toBe(false);
      expect(snapshots.engineOf('flat')).toBeNull();
      expect(snapshots.routesOf('flat')).toStrictEqual({});
    });
  });

  describe('GIVEN positions cached with no routes beside them', () => {
    it('WHEN seeded THEN the positions are kept and the routes are empty', () => {
      snapshots.seed('flat', FLAT_POSITIONS_STUB, null);

      expect(snapshots.has('flat')).toBe(true);
      expect(snapshots.routesOf('flat')).toStrictEqual({});
    });
  });

  describe('GIVEN an ELK layout with routes', () => {
    it('WHEN it is kept THEN its routes are kept with it', () => {
      const base = resultOf('h1', FLAT_POSITIONS_STUB);
      const result = { ...base, routes: ROUTES };

      snapshots.keep('flat', result);

      expect(snapshots.routesOf('flat')).toStrictEqual(ROUTES);
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
      snapshots.drag('folders', DRAGGED_POSITIONS_STUB, []);

      expect(snapshots.positionsOf('folders')).toStrictEqual(DRAGGED_POSITIONS_STUB);
      expect(snapshots.engineOf('folders')).toBe('fallback');
    });
  });
});
