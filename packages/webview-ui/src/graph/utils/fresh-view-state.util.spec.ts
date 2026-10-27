import { describe, expect, it } from 'vitest';

import { freshTaskViewOf, freshViewStateOf } from './fresh-view-state.util.ts';

const ORIGIN = { x: 0, y: 0 };

describe('FEATURE: freshViewStateOf', () => {
  describe('GIVEN a graph hash with no saved state', () => {
    it('WHEN a fresh state is made THEN it holds the hash, the default camera, no selection, the default controls, grouping on, no collapsed folders and package mode with no task', () => {
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
        folder: null,
        grouped: true,
        collapsed: [],
        mode: 'packages',
        task: null,
        panelWidths: null
      });
    });
  });

  it('GIVEN no saved task view WHEN a fresh one is made THEN nothing is chosen, the cap holds, depth is 1 and the camera is the default', () => {
    const task = freshTaskViewOf();

    expect(task).toStrictEqual({
      chosen: [],
      capLifted: false,
      depth: 1,
      selected: null,
      search: '',
      zoom: 1,
      pan: ORIGIN,
      layoutKey: ''
    });
  });
});
