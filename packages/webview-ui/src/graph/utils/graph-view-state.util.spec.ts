import { describe, expect, it } from 'vitest';

import { readGraphViewState } from './graph-view-state.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

const PAN: Position = { x: -10, y: 20 };

const LINK_REF = { source: 'web', target: 'ui' };

const TRACE_REF = { start: 'web', end: 'core' };

const LINK_WITHOUT_TARGET = { source: 'web' };

const LINK_WITH_NUMERIC_TARGET = { source: 'web', target: 3 };

const LINK_WITH_EXTRA_KEY = { ...LINK_REF, extra: 1 };

const TRACE_WITHOUT_END = { start: 'web' };

const TRACE_WITH_NULL_END = { start: 'web', end: null };

const TRACE_WITH_EXTRA_KEY = { ...TRACE_REF, extra: 1 };

const PROTO_LINK_REF = { source: '__proto__', target: 'constructor' };

const VALID: GraphViewState = {
  hash: 'h',
  zoom: 1.5,
  pan: PAN,
  selected: 'web',
  controlsOpen: false,
  search: 'ui',
  depth: 3,
  hidden: ['docs', '__proto__'],
  focus: 'core',
  tags: ['lib', 'constructor'],
  detailsOpen: false,
  link: LINK_REF,
  trace: TRACE_REF
};

const CAMERA = { hash: 'h', zoom: 1.5, pan: PAN, selected: 'web' };

const DEFAULTED: GraphViewState = {
  ...CAMERA,
  controlsOpen: true,
  search: '',
  depth: 1,
  hidden: [],
  focus: null,
  tags: [],
  detailsOpen: true,
  link: null,
  trace: null
};

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

    it('WHEN it holds only the camera and the selection THEN the controls fields take their defaults', () => {
      const state = readGraphViewState(CAMERA);

      expect(state).toStrictEqual(DEFAULTED);
    });
  });

  describe('GIVEN a valid state with one bad controls field', () => {
    it.each([
      ['a non-boolean controlsOpen', { controlsOpen: 'yes' }, { controlsOpen: true }],
      ['a non-string search', { search: 5 }, { search: '' }],
      ['a zero depth', { depth: 0 }, { depth: 1 }],
      ['a depth above the maximum', { depth: 6 }, { depth: 1 }],
      ['a fractional depth', { depth: 2.5 }, { depth: 1 }],
      ['a string depth', { depth: '3' }, { depth: 1 }],
      ['a NaN depth', { depth: NaN }, { depth: 1 }],
      ['a numeric focus', { focus: 4 }, { focus: null }],
      ['a string hidden', { hidden: 'docs' }, { hidden: [] }],
      ['a hidden with a number', { hidden: ['docs', 3] }, { hidden: [] }],
      ['a tags with a null', { tags: ['lib', null] }, { tags: [] }],
      ['a non-boolean detailsOpen', { detailsOpen: 'yes' }, { detailsOpen: true }],
      ['a string link', { link: 'web' }, { link: null }],
      ['a link without a target', { link: LINK_WITHOUT_TARGET }, { link: null }],
      ['a link with a numeric target', { link: LINK_WITH_NUMERIC_TARGET }, { link: null }],
      ['a link with an extra key', { link: LINK_WITH_EXTRA_KEY }, { link: LINK_REF }],
      ['a string trace', { trace: 'web' }, { trace: null }],
      ['a trace without an end', { trace: TRACE_WITHOUT_END }, { trace: null }],
      ['a trace with a null end', { trace: TRACE_WITH_NULL_END }, { trace: null }],
      ['a trace with an extra key', { trace: TRACE_WITH_EXTRA_KEY }, { trace: TRACE_REF }]
    ])('WHEN it holds %s THEN only that field falls back', (_name, bad, fixed) => {
      const state = readGraphViewState({ ...VALID, ...bad });

      expect(state).toStrictEqual({ ...VALID, ...fixed });
    });

    it.each([
      ['the minimum', 1],
      ['the maximum', 5]
    ])('WHEN depth is %s THEN it is kept', (_name, depth) => {
      const state = readGraphViewState({ ...VALID, depth });

      expect(state).toStrictEqual({ ...VALID, depth });
    });
  });

  describe('GIVEN a valid state with a null inspection field', () => {
    it.each([
      ['link', { link: null }],
      ['trace', { trace: null }]
    ])('WHEN %s is null THEN it stays null', (_name, nulled) => {
      const state = readGraphViewState({ ...VALID, ...nulled });

      expect(state).toStrictEqual({ ...VALID, ...nulled });
    });

    it('WHEN a link names __proto__ and constructor THEN it is kept', () => {
      const state = readGraphViewState({ ...VALID, link: PROTO_LINK_REF });

      expect(state).toStrictEqual({ ...VALID, link: PROTO_LINK_REF });
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
