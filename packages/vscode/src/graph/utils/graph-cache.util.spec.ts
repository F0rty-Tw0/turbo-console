import type { GraphState, Positions } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { acceptedPositions, layoutEntryOf } from './graph-cache.util.ts';
import { GRAPH_STATE_STUB, POSITIONS_STUB } from '../test/stubs/graph-model.stub.ts';

const STATE: GraphState = GRAPH_STATE_STUB;
const HASH = 'dc7e01eb';

const withPoint = (name: string, point: unknown): Record<string, unknown> => {
  const merged = { ...POSITIONS_STUB, [name]: point };

  return merged;
};

describe('FEATURE: accepted positions', () => {
  it('GIVEN the current hash, the exact key set and finite values WHEN checked THEN they are returned', () => {
    const accepted = acceptedPositions(STATE, { hash: HASH, positions: POSITIONS_STUB });

    expect(accepted).toStrictEqual(POSITIONS_STUB);
  });

  it('GIVEN a value with an extra key WHEN checked THEN the key is not in the result', () => {
    const accepted: Positions | null = acceptedPositions(STATE, { hash: HASH, positions: withPoint('a', { x: 1, y: 2, z: 3 }) });

    expect(accepted?.['a']).toStrictEqual({ x: 1, y: 2 });
  });

  it('GIVEN a hash that differs (a newer state) WHEN checked THEN it is null', () => {
    expect(acceptedPositions(STATE, { hash: 'ffffffff', positions: POSITIONS_STUB })).toBeNull();
  });

  it.each<[string, GraphState]>([
    ['loading', { kind: 'loading' }],
    ['error', { kind: 'error', message: 'x' }],
    ['singlePackage', { kind: 'singlePackage' }]
  ])('GIVEN a %s state WHEN checked THEN it is null', (_name, state) => {
    expect(acceptedPositions(state, { hash: HASH, positions: POSITIONS_STUB })).toBeNull();
  });

  it('GIVEN a key outside packages WHEN checked THEN it is null', () => {
    const positions = withPoint('ghost', { x: 1, y: 1 });

    expect(acceptedPositions(STATE, { hash: HASH, positions })).toBeNull();
  });

  it('GIVEN a package missing from the map WHEN checked THEN it is null', () => {
    const point = { x: 1, y: 1 };
    const positions = { a: point, web: point };

    expect(acceptedPositions(STATE, { hash: HASH, positions })).toBeNull();
  });

  it.each([
    ['NaN x', withPoint('a', { x: NaN, y: 1 })],
    ['Infinity y', withPoint('a', { x: 1, y: Infinity })],
    ['a string value', withPoint('a', 'nope')],
    ['an array map', [1, 2, 3]],
    ['a null map', null]
  ])('GIVEN %s WHEN checked THEN it is null', (_name, positions) => {
    expect(acceptedPositions(STATE, { hash: HASH, positions })).toBeNull();
  });
});

describe('FEATURE: layout entry read from storage', () => {
  it('GIVEN a valid entry WHEN read THEN it is returned', () => {
    const entry = layoutEntryOf({ hash: HASH, positions: POSITIONS_STUB });

    expect(entry).toStrictEqual({ hash: HASH, positions: POSITIONS_STUB });
  });

  it.each([
    ['undefined', undefined],
    ['a string', 'x'],
    ['no hash', { positions: POSITIONS_STUB }],
    ['non-finite coordinates', { hash: HASH, positions: withPoint('a', { x: NaN, y: 0 }) }]
  ])('GIVEN %s WHEN read THEN it is null', (_name, raw) => {
    expect(layoutEntryOf(raw)).toBeNull();
  });
});
