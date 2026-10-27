import type { GraphState, Positions } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { acceptedPositions, cacheKeyOf, coversExactly, layoutEntryOf } from './graph-cache.util.ts';
import { GRAPH_HASH_STUB, GRAPH_PACKAGES_STUB, GRAPH_STATE_STUB, POSITIONS_STUB } from '../test/stubs/graph-model.stub.ts';

const STATE: GraphState = GRAPH_STATE_STUB;
const POINT = { x: 1, y: 1 };
const PROTO_ENTRY_JSON = `{"hash":"${GRAPH_HASH_STUB}","positions":{"__proto__":{"x":1,"y":2}}}`;

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
    const entry = layoutEntryOf({ hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB });

    expect(entry).toStrictEqual({ hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB });
  });

  it('GIVEN a point with an extra key WHEN read THEN the key is not in the result', () => {
    const entry = layoutEntryOf({ hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1, y: 2, z: 3 }) });

    expect(entry?.positions['a']).toStrictEqual({ x: 1, y: 2 });
  });

  it('GIVEN coordinates exactly at the limit WHEN read THEN the entry is kept', () => {
    const positions = withPoint('a', { x: 1e7, y: -1e7 });

    expect(layoutEntryOf({ hash: GRAPH_HASH_STUB, positions })).not.toBeNull();
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
    ['no hash', { positions: POSITIONS_STUB }],
    ['no positions', { hash: GRAPH_HASH_STUB }],
    ['a hash that is not a string', { hash: 1, positions: POSITIONS_STUB }],
    ['NaN x', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: NaN, y: 0 }) }],
    ['Infinity y', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1, y: Infinity }) }],
    ['an x past 1e7', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1e7 + 1, y: 0 }) }],
    ['a y below -1e7', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 0, y: -1e7 - 1 }) }],
    ['a point missing y', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: 1 }) }],
    ['a string coordinate', { hash: GRAPH_HASH_STUB, positions: withPoint('a', { x: '1', y: 0 }) }],
    ['a string value', { hash: GRAPH_HASH_STUB, positions: withPoint('a', 'nope') }],
    ['an array map', { hash: GRAPH_HASH_STUB, positions: [1, 2, 3] }],
    ['a null map', { hash: GRAPH_HASH_STUB, positions: null }]
  ])('GIVEN %s WHEN read THEN it is null', (_name, raw) => {
    expect(layoutEntryOf(raw)).toBeNull();
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
