import type { GraphState, Positions } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { acceptedPositions, acceptedRoutes, cacheKeyOf, coversExactly, layoutEntryOf, parseRoutes } from './graph-cache.util.ts';
import {
  BAD_ROUTES_JSON_STUB,
  GHOST_ROUTES_STUB,
  GRAPH_HASH_STUB,
  GRAPH_PACKAGES_STUB,
  GRAPH_STATE_STUB,
  MIXED_ROUTES_STUB,
  POSITIONS_STUB,
  ROUTES_STUB
} from '../test/stubs/graph-model.stub.ts';

const STATE: GraphState = GRAPH_STATE_STUB;
const POINT = { x: 1, y: 1 };
const PROTO_ENTRY_JSON = `{"hash":"${GRAPH_HASH_STUB}","positions":{"__proto__":{"x":1,"y":2}},"routes":{}}`;

const withPoint = (name: string, point: unknown): Record<string, unknown> => {
  const merged = { ...POSITIONS_STUB, [name]: point };

  return merged;
};

/** `POSITIONS_STUB` with `web` renamed to `ghost`: the same key count, one key that is not a package. */
const renamedPositions = (): Positions => {
  const { web, ...rest } = POSITIONS_STUB;
  const renamed: Positions = { ...rest, ghost: web ?? POINT };

  return renamed;
};

describe('FEATURE: accepted positions', () => {
  it('GIVEN the current hash and the exact key set WHEN checked THEN they are returned', () => {
    const accepted = acceptedPositions(STATE, { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB });

    expect(accepted).toStrictEqual(POSITIONS_STUB);
  });

  it('GIVEN a hash that differs (a newer state) WHEN checked THEN it is null', () => {
    expect(acceptedPositions(STATE, { hash: 'ffffffff', positions: POSITIONS_STUB })).toBeNull();
  });

  it.each<[string, GraphState]>([
    ['loading', { kind: 'loading' }],
    ['error', { kind: 'error', message: 'x' }]
  ])('GIVEN a %s state WHEN checked THEN it is null', (_name, state) => {
    expect(acceptedPositions(state, { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB })).toBeNull();
  });

  it('GIVEN a key outside packages WHEN checked THEN it is null', () => {
    const positions: Positions = { ...POSITIONS_STUB, ghost: POINT };

    expect(acceptedPositions(STATE, { hash: GRAPH_HASH_STUB, positions })).toBeNull();
  });

  it('GIVEN a package missing from the map WHEN checked THEN it is null', () => {
    const positions: Positions = { a: POINT, web: POINT };

    expect(acceptedPositions(STATE, { hash: GRAPH_HASH_STUB, positions })).toBeNull();
  });

  it('GIVEN one package renamed to a name outside packages (same key count) WHEN checked THEN it is null', () => {
    expect(acceptedPositions(STATE, { hash: GRAPH_HASH_STUB, positions: renamedPositions() })).toBeNull();
  });
});

describe('FEATURE: exact key cover', () => {
  it.each<[string, Positions, boolean]>([
    ['the exact key set', POSITIONS_STUB, true],
    ['an extra key', { ...POSITIONS_STUB, ghost: POINT }, false],
    ['a missing key', { a: POINT, web: POINT }, false],
    ['a renamed key', renamedPositions(), false]
  ])('GIVEN %s WHEN checked against the packages THEN it is %s', (_name, positions, expected) => {
    expect(coversExactly(positions, GRAPH_PACKAGES_STUB)).toBe(expected);
  });
});

describe('FEATURE: layout entry read from storage', () => {
  it('GIVEN a valid entry WHEN read THEN it is returned', () => {
    const entry = layoutEntryOf({ hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB, routes: {} });

    expect(entry).toStrictEqual({ hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB, routes: {} });
  });

  it('GIVEN a point with an extra key WHEN read THEN the key is not in the result', () => {
    const entry = layoutEntryOf({ hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1, y: 2, z: 3 }), routes: {} });

    expect(entry?.positions['a']).toStrictEqual({ x: 1, y: 2 });
  });

  it('GIVEN coordinates exactly at the limit WHEN read THEN the entry is kept', () => {
    const positions = withPoint('a', { x: 1e7, y: -1e7 });

    expect(layoutEntryOf({ hash: GRAPH_HASH_STUB, positions, routes: {} })).not.toBeNull();
  });

  describe('GIVEN a __proto__ key from parsed JSON', () => {
    it('WHEN read THEN it is an own key holding the point', () => {
      const entry = layoutEntryOf(JSON.parse(PROTO_ENTRY_JSON));

      expect(Object.getOwnPropertyDescriptor(entry?.positions, '__proto__')?.value).toStrictEqual({ x: 1, y: 2 });
    });

    it('WHEN read THEN the prototype of the positions is untouched', () => {
      const entry = layoutEntryOf(JSON.parse(PROTO_ENTRY_JSON));

      expect(Object.getPrototypeOf(entry?.positions)).toBe(Object.prototype);
    });
  });

  it.each([
    ['undefined', undefined],
    ['a string', 'x'],
    ['no hash', { positions: POSITIONS_STUB, routes: {} }],
    ['no positions', { hash: GRAPH_HASH_STUB, routes: {} }],
    ['a hash that is not a string', { hash: 1, positions: POSITIONS_STUB, routes: {} }],
    ['NaN x', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: NaN, y: 0 }), routes: {} }],
    ['Infinity y', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1, y: Infinity }), routes: {} }],
    ['an x past 1e7', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1e7 + 1, y: 0 }), routes: {} }],
    ['a y below -1e7', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 0, y: -1e7 - 1 }), routes: {} }],
    ['a point missing y', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1 }), routes: {} }],
    ['a string coordinate', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: '1', y: 0 }), routes: {} }],
    ['a string value', { hash: GRAPH_HASH_STUB, positions: withPoint('a', 'nope'), routes: {} }],
    ['an array map', { hash: GRAPH_HASH_STUB, positions: [1, 2, 3], routes: {} }],
    ['a null map', { hash: GRAPH_HASH_STUB, positions: null, routes: {} }]
  ])('GIVEN %s WHEN read THEN it is null', (_name, raw) => {
    expect(layoutEntryOf(raw)).toBeNull();
  });

  describe('GIVEN the routes of an entry', () => {
    const BASE = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB };

    it('WHEN the entry goes through JSON and is read THEN it comes back equal', () => {
      const entry = { ...BASE, routes: ROUTES_STUB };

      expect(layoutEntryOf(JSON.parse(JSON.stringify(entry)))).toStrictEqual(entry);
    });

    it('WHEN routes is an empty record THEN the entry is a hit', () => {
      expect(layoutEntryOf({ ...BASE, routes: {} })).not.toBeNull();
    });

    it.each([
      ['no routes key', BASE],
      ['null routes', { ...BASE, routes: null }],
      ['routes a list', { ...BASE, routes: [] }],
      ['routes a string', { ...BASE, routes: 'x' }]
    ])('WHEN the entry has %s THEN it is a miss', (_name, raw) => {
      expect(layoutEntryOf(raw)).toBeNull();
    });

    it('WHEN one route is bad THEN the entry is a hit without that route', () => {
      const entry = layoutEntryOf({ ...BASE, routes: BAD_ROUTES_JSON_STUB });

      expect(entry?.routes).toStrictEqual(ROUTES_STUB);
    });
  });
});

describe('FEATURE: accepted routes', () => {
  it('GIVEN routes for every edge WHEN accepted THEN all are kept', () => {
    expect(acceptedRoutes(STATE, { routes: ROUTES_STUB })).toStrictEqual(ROUTES_STUB);
  });

  it('GIVEN one route whose key is no edge id WHEN accepted THEN that route alone is dropped', () => {
    expect(acceptedRoutes(STATE, { routes: MIXED_ROUTES_STUB })).toStrictEqual(ROUTES_STUB);
  });

  it('GIVEN only unknown keys WHEN accepted THEN the result is {}', () => {
    expect(acceptedRoutes(STATE, { routes: GHOST_ROUTES_STUB })).toStrictEqual({});
  });

  it('GIVEN a loading state WHEN accepted THEN the result is {}', () => {
    expect(acceptedRoutes({ kind: 'loading' }, { routes: ROUTES_STUB })).toStrictEqual({});
  });
});

describe('FEATURE: routes read from a post', () => {
  const START = { x: 1, y: 2 };
  const BEND = { x: 3, y: 4 };
  const END = { x: 5, y: 6 };
  const ROUTE = { start: START, bends: [BEND], end: END };
  const BAD_ROUTE = { ...ROUTE, bends: 'nope' };

  it('GIVEN an empty record WHEN read THEN it is an empty record', () => {
    expect(parseRoutes({})).toStrictEqual({});
  });

  it('GIVEN a good route WHEN read THEN a copy of it is returned', () => {
    const routes = parseRoutes({ e1: ROUTE });

    expect(routes).toStrictEqual({ e1: ROUTE });
  });

  it('GIVEN a bad route beside a good one WHEN read THEN only the bad one is dropped', () => {
    expect(parseRoutes({ good: ROUTE, bad: BAD_ROUTE })).toStrictEqual({ good: ROUTE });
  });

  it.each([
    ['a Map', new Map([['e1', ROUTE]])],
    ['a list', [ROUTE]],
    ['null', null],
    ['a string', 'e1'],
    ['undefined', undefined]
  ])('GIVEN %s WHEN read THEN it is null', (_name, raw) => {
    expect(parseRoutes(raw)).toBeNull();
  });
});

describe('FEATURE: cache key', () => {
  it('GIVEN the flat grouping WHEN keyed THEN it is the flat prefix and the root', () => {
    expect(cacheKeyOf('/ws', 'flat')).toBe('turboConsole.graphLayout:/ws');
  });

  it('GIVEN the folders grouping WHEN keyed THEN it is the folders prefix and the root', () => {
    expect(cacheKeyOf('/ws', 'folders')).toBe('turboConsole.graphLayout.folders:/ws');
  });

  it('GIVEN a root that starts like the folders prefix WHEN keyed flat THEN it differs from the folders key of the shorter root', () => {
    expect(cacheKeyOf('.folders:/ws', 'flat')).not.toBe(cacheKeyOf('/ws', 'folders'));
  });
});
