import { describe, expect, it } from 'vitest';

import { readGraphViewState } from './graph-view-state.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

const PAN: Position = { x: -10, y: 20 };

const VALID: GraphViewState = { hash: 'h', zoom: 1.5, pan: PAN, selected: 'web' };

const ORIGIN: Position = { x: 0, y: 0 };

const PAN_WITHOUT_Y = { x: 1 };

const INFINITE_PAN: Position = { x: Infinity, y: 0 };

const PAN_WITH_EXTRA_KEY = { ...PAN, z: 3 };

describe('FEATURE: readGraphViewState', () => {
  describe('GIVEN a valid saved state', () => {
    it.each([
      ['a selection', VALID],
      ['no selection', { ...VALID, selected: null }]
    ])('WHEN it holds %s THEN it comes back equal', (_name, raw) => {
      const state = readGraphViewState(raw);

      expect(state).toStrictEqual(raw);
    });

    it('WHEN it carries extra keys THEN they are stripped', () => {
      const raw = { ...VALID, extra: 1, pan: PAN_WITH_EXTRA_KEY };

      const state = readGraphViewState(raw);

      expect(state).toStrictEqual(VALID);
    });
  });

  describe('GIVEN an invalid raw value', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'x'],
      ['an empty object', {}],
      ['a missing selected', { hash: 'h', zoom: 1, pan: ORIGIN }],
      ['a numeric hash', { ...VALID, hash: 5 }],
      ['a zero zoom', { ...VALID, zoom: 0 }],
      ['a negative zoom', { ...VALID, zoom: -1 }],
      ['a NaN zoom', { ...VALID, zoom: NaN }],
      ['a string zoom', { ...VALID, zoom: '1' }],
      ['a null pan', { ...VALID, pan: null }],
      ['a pan without y', { ...VALID, pan: PAN_WITHOUT_Y }],
      ['an infinite pan', { ...VALID, pan: INFINITE_PAN }],
      ['a numeric selected', { ...VALID, selected: 3 }]
    ])('WHEN it is %s THEN the result is null', (_name, raw) => {
      const state = readGraphViewState(raw);

      expect(state).toBeNull();
    });
  });
});
