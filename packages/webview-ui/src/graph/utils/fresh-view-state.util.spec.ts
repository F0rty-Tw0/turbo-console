import { describe, expect, it } from 'vitest';

import { freshViewStateOf } from './fresh-view-state.util.ts';

const ORIGIN = { x: 0, y: 0 };

describe('FEATURE: freshViewStateOf', () => {
  describe('GIVEN a graph hash with no saved state', () => {
    it('WHEN a fresh state is made THEN it holds the hash, the default camera, no selection and the default controls and no grouping', () => {
      const state = freshViewStateOf('h');

      expect(state).toStrictEqual({
        hash: 'h',
        zoom: 1,
        pan: ORIGIN,
        selected: null,
        controlsOpen: true,
        search: '',
        depth: 1,
        hidden: [],
        focus: null,
        tags: [],
        detailsOpen: true,
        link: null,
        trace: null,
        grouped: false
      });
    });
  });
});
