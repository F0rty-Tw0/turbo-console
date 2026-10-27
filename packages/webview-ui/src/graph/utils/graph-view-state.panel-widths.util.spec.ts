import { describe, expect, it } from 'vitest';

import { readGraphViewState } from './graph-view-state.util.ts';

const PAN = { x: -10, y: 20 };

const CAMERA = { hash: 'h', zoom: 1.5, pan: PAN, selected: 'web' };

describe('FEATURE: readGraphViewState panelWidths', () => {
  describe('GIVEN a saved panelWidths', () => {
    it.each([
      ['a valid pair', { controls: 320, details: 300 }, { controls: 320, details: 300 }],
      ['NaN', { controls: Number.NaN, details: 300 }, null],
      ['negative', { controls: -1, details: 300 }, null],
      ['zero', { controls: 320, details: 0 }, null],
      ['a missing side', { controls: 320 }, null],
      ['a string side', { controls: '320', details: 300 }, null],
      ['not a record', 5, null]
    ])('WHEN it holds %s THEN panelWidths reads %j', (_title, raw, expected) => {
      const state = readGraphViewState({ ...CAMERA, panelWidths: raw });

      expect(state?.panelWidths).toStrictEqual(expected);
    });
  });
});
