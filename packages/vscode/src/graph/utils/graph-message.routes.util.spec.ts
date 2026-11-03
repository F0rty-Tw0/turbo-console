import type { EdgeRoute, GraphWebviewMessage, Position, Routes } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { parseGraphMessage } from './graph-message.util.ts';
import { POSITIONS_MAX } from '../common/graph.const.ts';

/** `count` bends, each a fresh point. */
const bendsOf = (count: number): Position[] => {
  const bend: Position = { x: 1, y: 1 };
  const bends = Array.from({ length: count }, () => bend);

  return bends;
};

const HASH = 'dc7e01eb';
const POINT: Position = { x: 1, y: 2 };
const POSITIONS = { a: POINT };
const POINT_WITHOUT_Y = { x: 1 };
const POSITIONS_WITHOUT_Y = { a: POINT_WITHOUT_Y };
const BEND: Position = { x: 3, y: 4 };
const END: Position = { x: 5, y: 6 };
const NAN_END: Position = { x: NaN, y: 0 };
const FAR_START: Position = { x: 1e7 + 1, y: 0 };
const LIMIT_START: Position = { x: 1e7, y: -1e7 };
const LIMIT_END: Position = { x: -1e7, y: 1e7 };
const ROUTE: EdgeRoute = { start: POINT, bends: [BEND], end: END };
const BAD_ROUTE = { ...ROUTE, end: NAN_END };
const BENDS_65 = { ...ROUTE, bends: bendsOf(65) };
const FAR_ROUTE = { ...ROUTE, start: FAR_START };
const NO_BENDS_ROUTE = { start: POINT, end: END };
const LIMIT_ROUTE = { start: LIMIT_START, bends: bendsOf(64), end: LIMIT_END };

class Routed {
  public readonly e1 = ROUTE;
}
const NOISY_POINT = { x: 1, y: 2, z: 3 };
const NOISY_BEND = { x: 3, y: 4, z: 5 };
const NOISY_ROUTE = { ...ROUTE, z: 9, start: NOISY_POINT, bends: [NOISY_BEND] };
const PROTO_ROUTES_JSON = `{"type":"positions","hash":"${HASH}","positions":{"a":{"x":1,"y":2}},"routes":{"__proto__":{"start":{"x":1,"y":2},"bends":[],"end":{"x":5,"y":6}}},"grouping":"flat"}`;
const THROWING_ROUTE = {
  get start(): never {
    throw new Error('walked');
  },
  get bends(): never {
    throw new Error('walked');
  },
  get end(): never {
    throw new Error('walked');
  }
};
const THROWING_ROUTES = {
  type: 'positions',
  hash: HASH,
  positions: POSITIONS,
  grouping: 'flat',
  get routes(): never {
    throw new Error('getter trap');
  }
};
const EXPECTED_DROPPED = { type: 'positions', hash: HASH, positions: POSITIONS, routes: {}, grouping: 'flat' };

/** A routes record with `count` keys, each holding `route`. */
const routesWith = (count: number, route: unknown): Record<string, unknown> => {
  const entries = Array.from({ length: count }, (_, index): [string, unknown] => [`e${index}`, route]);
  const routes = Object.fromEntries(entries);

  return routes;
};

/** A flat `positions` post with the given `positions` and `routes` (the field is left out when `routes` is `undefined`). */
const postWith = (routes: unknown, positions: unknown = POSITIONS): Record<string, unknown> => {
  const post: Record<string, unknown> = { type: 'positions', hash: HASH, positions, routes, grouping: 'flat' };

  if (routes === undefined) delete post['routes'];

  return post;
};

/** The routes of a parsed `positions` message, else `null`. */
const routesIn = (parsed: GraphWebviewMessage | null): Routes | null => {
  if (parsed?.type !== 'positions') return null;

  return parsed.routes;
};

describe('FEATURE: graph positions routes validation', () => {
  describe('GIVEN a positions post whose routes are bad (a2)', () => {
    it.each([
      ['65 bends on the only route', { e1: BENDS_65 }],
      ['a NaN coordinate', { e1: BAD_ROUTE }],
      ['a coordinate past 1e7', { e1: FAR_ROUTE }],
      ['a route that is a string', { e1: 'nope' }],
      ['a route with no bends field', { e1: NO_BENDS_ROUTE }],
      ['a list of routes', [ROUTE]],
      ['null routes', null],
      ['no routes field', undefined],
      ['a Map of routes', new Map([['e1', ROUTE]])],
      ['routes of a class instance', new Routed()],
      ['a string for routes', 'e1'],
      ['5001 route keys, whose values throw if read', routesWith(POSITIONS_MAX + 1, THROWING_ROUTE)]
    ])('WHEN parsed THEN %s keep the positions and give routes {}', (_label, routes) => {
      const parsed = parseGraphMessage(postWith(routes));

      expect(parsed).toStrictEqual(EXPECTED_DROPPED);
    });
  });

  describe('GIVEN routes where one is bad', () => {
    it('WHEN parsed THEN only the bad route is dropped', () => {
      const parsed = parseGraphMessage(postWith({ good: ROUTE, bad: BAD_ROUTE }));

      expect(routesIn(parsed)).toStrictEqual({ good: ROUTE });
    });
  });

  describe('GIVEN routes at their limits', () => {
    it('WHEN a route has 64 bends and coordinates at +-1e7 THEN it is kept', () => {
      const parsed = parseGraphMessage(postWith({ e1: LIMIT_ROUTE }));

      expect(routesIn(parsed)).toStrictEqual({ e1: LIMIT_ROUTE });
    });

    it('WHEN the routes have exactly 5000 keys THEN they are all kept', () => {
      const parsed = parseGraphMessage(postWith(routesWith(POSITIONS_MAX, ROUTE)));

      expect(Object.keys(routesIn(parsed) ?? {})).toHaveLength(POSITIONS_MAX);
    });
  });

  describe('GIVEN a route with extra keys', () => {
    it('WHEN parsed THEN only x and y of each point come back', () => {
      const parsed = parseGraphMessage(postWith({ e1: NOISY_ROUTE }));

      expect(routesIn(parsed)).toStrictEqual({ e1: ROUTE });
    });

    it('WHEN parsed THEN the route is a fresh copy of the input', () => {
      const parsed = parseGraphMessage(postWith({ e1: ROUTE }));

      expect(routesIn(parsed)?.['e1']).not.toBe(ROUTE);
    });

    it('WHEN parsed THEN the bends are a fresh array', () => {
      const parsed = parseGraphMessage(postWith({ e1: ROUTE }));

      expect(routesIn(parsed)?.['e1']?.bends).not.toBe(ROUTE.bends);
    });

    it('WHEN parsed THEN each bend is a fresh point', () => {
      const parsed = parseGraphMessage(postWith({ e1: ROUTE }));

      expect(routesIn(parsed)?.['e1']?.bends[0]).not.toBe(BEND);
    });
  });

  describe('GIVEN routes parsed from JSON with an own __proto__ key', () => {
    it('WHEN parsed THEN the route stays an own key', () => {
      const routes = routesIn(parseGraphMessage(JSON.parse(PROTO_ROUTES_JSON)));

      expect(Object.getOwnPropertyDescriptor(routes ?? {}, '__proto__')?.value).toStrictEqual({ start: POINT, bends: [], end: END });
    });

    it('WHEN parsed THEN the prototype of the routes is untouched', () => {
      const routes = routesIn(parseGraphMessage(JSON.parse(PROTO_ROUTES_JSON)));

      expect(Object.getPrototypeOf(routes)).toBe(Object.prototype);
    });
  });

  describe('GIVEN bad positions', () => {
    it('WHEN the routes are good THEN the whole message is null', () => {
      expect(parseGraphMessage(postWith({ e1: ROUTE }, POSITIONS_WITHOUT_Y))).toBeNull();
    });
  });

  describe('GIVEN a routes getter that throws', () => {
    it('WHEN parsed THEN the message is null (never reachable over structured clone)', () => {
      expect(parseGraphMessage(THROWING_ROUTES)).toBeNull();
    });
  });
});
