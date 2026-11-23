import { describe, expect, it } from 'vitest';

import { freshModulesViewOf, freshTaskViewOf, freshViewStateOf } from './fresh-view-state.util.ts';

const ORIGIN = { x: 0, y: 0 };

const TESTS_HIDDEN = { types: true, tests: false, lazies: true };

describe('FEATURE: freshViewStateOf', () => {
  describe('GIVEN a graph hash with no saved state', () => {
    it('WHEN a fresh state is made THEN it holds the hash, the default camera, no selection, the default controls, grouping on, no collapsed folders and package mode with no task', () => {
      const state = freshViewStateOf('h');

      expect(state).toStrictEqual({
        hash: 'h',
        zoom: 1,
        pan: ORIGIN,
        fitted: false,
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
        modules: null,
        panelWidths: null
      });
    });
  });

  describe('GIVEN no saved task view', () => {
    it('WHEN a fresh one is made THEN nothing is chosen, the cap holds, depth is 1 and the camera is the default', () => {
      const task = freshTaskViewOf();

      expect(task).toStrictEqual({
        chosen: [],
        capLifted: false,
        depth: 1,
        selected: null,
        search: '',
        zoom: 1,
        pan: ORIGIN,
        fitted: false,
        layoutKey: ''
      });
    });
  });

  describe('GIVEN the package web with no modules view saved', () => {
    it('WHEN its fresh modules view is built THEN nothing is expanded yet, every kind but test files shows, the camera fits, nothing selected or focused, depth 1', () => {
      expect(freshModulesViewOf('web')).toStrictEqual({
        packageName: 'web',
        expanded: null,
        shown: TESTS_HIDDEN,
        camera: null,
        selected: null,
        focus: null,
        depth: 1
      });
    });
  });
});
