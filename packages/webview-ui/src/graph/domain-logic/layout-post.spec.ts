import { describe, expect, it } from 'vitest';

import { postLayout } from './layout-post.ts';
import type { Routes } from '../../bridge/common/graph-state.type.ts';
import { ROUTE_BENDS_MAX } from '../common/graph-layout.const.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { bridgeMock } from '../test/mocks/bridge.mock.ts';
import { CENTRES_STUB, ROUTES_STUB } from '../test/stubs/layout.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { routeWithBends } from '../test/utils/route-bends.spec.util.ts';

describe('FEATURE: postLayout', () => {
  describe('GIVEN an elk result with routes', () => {
    it('WHEN posted THEN the positions post carries them', () => {
      const bridge = bridgeMock();
      const plain = resultOf('h1', CENTRES_STUB);
      const routed: LayoutResult = { ...plain, routes: ROUTES_STUB };

      postLayout(bridge, routed, 'flat');

      expect(bridge.post).toHaveBeenNthCalledWith(1, {
        type: 'positions',
        hash: 'h1',
        positions: CENTRES_STUB,
        routes: ROUTES_STUB,
        grouping: 'flat'
      });
    });

    it('WHEN posted THEN layoutDone follows the positions post', () => {
      const bridge = bridgeMock();

      postLayout(bridge, resultOf('h1', CENTRES_STUB), 'flat');

      expect(bridge.post).toHaveBeenNthCalledWith(2, { type: 'layoutDone', ms: 5, engine: 'elk' });
    });
  });

  describe('GIVEN an elk result with a route of ROUTE_BENDS_MAX + 1 bends beside a short one', () => {
    it('WHEN posted THEN the positions post carries only the short route', () => {
      const bridge = bridgeMock();
      const short = routeWithBends(1);
      const long = routeWithBends(ROUTE_BENDS_MAX + 1);
      const routes: Routes = { long, short };
      const shortOnly: Routes = { short };
      const plain = resultOf('h1', CENTRES_STUB);
      const result: LayoutResult = { ...plain, routes };

      postLayout(bridge, result, 'flat');

      expect(bridge.post).toHaveBeenNthCalledWith(1, {
        type: 'positions',
        hash: 'h1',
        positions: CENTRES_STUB,
        routes: shortOnly,
        grouping: 'flat'
      });
    });

    it('WHEN posted THEN the result still holds both routes', () => {
      const bridge = bridgeMock();
      const routes: Routes = { long: routeWithBends(ROUTE_BENDS_MAX + 1), short: routeWithBends(1) };
      const plain = resultOf('h1', CENTRES_STUB);
      const result: LayoutResult = { ...plain, routes };

      postLayout(bridge, result, 'flat');

      expect(Object.keys(result.routes)).toStrictEqual(['long', 'short']);
    });
  });

  describe('GIVEN an elk result with a route of exactly ROUTE_BENDS_MAX bends', () => {
    it('WHEN posted THEN the positions post carries it', () => {
      const bridge = bridgeMock();
      const routes: Routes = { edge: routeWithBends(ROUTE_BENDS_MAX) };
      const plain = resultOf('h1', CENTRES_STUB);
      const result: LayoutResult = { ...plain, routes };

      postLayout(bridge, result, 'flat');

      expect(bridge.post).toHaveBeenNthCalledWith(1, {
        type: 'positions',
        hash: 'h1',
        positions: CENTRES_STUB,
        routes,
        grouping: 'flat'
      });
    });
  });

  describe('GIVEN a fallback result', () => {
    it('WHEN posted THEN only layoutDone goes to the host', () => {
      const bridge = bridgeMock();

      postLayout(bridge, resultOf('h1', CENTRES_STUB, 'fallback'), 'flat');

      expect(bridge.post).toHaveBeenCalledExactlyOnceWith({ type: 'layoutDone', ms: 5, engine: 'fallback' });
    });
  });
});
