import { describe, expect, it } from 'vitest';

import { hasSavedGrouping, readGraphViewState } from './graph-view-state.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphFocus, GraphViewState, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';

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

const CORE_FOCUS: GraphFocus = { kind: 'package', name: 'core' };

const VALID: GraphViewState = {
  hash: 'h',
  zoom: 1.5,
  pan: PAN,
  selected: 'web',
  controlsOpen: false,
  search: 'ui',
  depth: 3,
  hidden: ['docs', '__proto__'],
  focus: CORE_FOCUS,
  tags: ['lib', 'constructor'],
  detailsOpen: false,
  link: LINK_REF,
  trace: TRACE_REF,
  folder: 'apps',
  grouped: true,
  collapsed: ['apps', '__proto__'],
  mode: 'packages',
  task: null
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
  trace: null,
  folder: null,
  grouped: true,
  collapsed: [],
  mode: 'packages',
  task: null
};

const ORIGIN: Position = { x: 0, y: 0 };

const PAN_WITHOUT_Y = { x: 1 };

const INFINITE_PAN: Position = { x: Infinity, y: 0 };

const PAN_WITH_EXTRA_KEY = { ...PAN, z: 3 };

const TASK: TaskViewState = {
  chosen: ['web#build'],
  capLifted: false,
  depth: 1,
  selected: null,
  search: '',
  zoom: 1,
  pan: ORIGIN,
  layoutKey: 'k1'
};

const TASK_STATE: GraphViewState = { ...VALID, mode: 'tasks', task: TASK };

const NO_TASK = { mode: 'packages', task: null };

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

  describe('GIVEN a state with a saved grouped value', () => {
    it.each([
      ['true', true, { grouped: true }],
      ['false', false, { grouped: false }],
      ['missing', true, {}],
      ["the string 'true'", true, { grouped: 'true' }],
      ['the number 1', true, { grouped: 1 }]
    ])('WHEN it is %s THEN grouped reads %s', (_name, expected, saved) => {
      const state = readGraphViewState({ ...CAMERA, ...saved });

      expect(state?.grouped).toBe(expected);
    });
  });

  describe('GIVEN a raw saved state for hasSavedGrouping', () => {
    it.each([
      ['a boolean grouped value', true, { ...CAMERA, grouped: false }],
      ['no grouped value, as saved before folders existed', false, CAMERA],
      ["the string 'true'", false, { ...CAMERA, grouped: 'true' }],
      ['nothing', false, undefined]
    ])('WHEN it holds %s THEN a grouping choice is saved: %s', (_name, expected, raw) => {
      expect(hasSavedGrouping(raw)).toBe(expected);
    });
  });

  describe('GIVEN a state with a saved collapsed value', () => {
    it.each([
      ['a folder list', ['apps', '(root)'], { collapsed: ['apps', '(root)'] }],
      ['an empty list', [], { collapsed: [] }],
      ['missing', [], {}],
      ['a string', [], { collapsed: 'apps' }],
      ['a list with a number', [], { collapsed: [1] }]
    ])('WHEN it is %s THEN collapsed reads %j', (_name, expected, saved) => {
      const state = readGraphViewState({ ...CAMERA, ...saved });

      expect(state?.collapsed).toStrictEqual(expected);
    });
  });

  describe('GIVEN a state with a saved focus value', () => {
    it.each([
      ['the old package string', 'web', { kind: 'package', name: 'web' }],
      ['a package focus', { kind: 'package', name: 'web' }, { kind: 'package', name: 'web' }],
      ['a package focus with an extra key', { kind: 'package', name: 'web', depth: 3 }, { kind: 'package', name: 'web' }],
      ['a folder focus', { kind: 'folder', folder: 'apps' }, { kind: 'folder', folder: 'apps' }],
      ['the root folder focus', { kind: 'folder', folder: '' }, { kind: 'folder', folder: '' }],
      ['an empty old string', '', { kind: 'package', name: '' }],
      ['a folder focus with a number', { kind: 'folder', folder: 3 }, null],
      ['a package focus with a number', { kind: 'package', name: 1 }, null],
      ['an unknown kind', { kind: 'other' }, null],
      ['null', null, null],
      ['the number 5', 5, null]
    ])('WHEN it is %s THEN focus reads %j', (_name, focus, expected) => {
      const state = readGraphViewState({ ...CAMERA, focus });

      expect(state?.focus).toStrictEqual(expected);
    });

    it('WHEN it is missing THEN focus reads null', () => {
      const state = readGraphViewState(CAMERA);

      expect(state?.focus).toBeNull();
    });

    it('WHEN it is a parsed __proto__ folder THEN the folder is kept', () => {
      const focus: unknown = JSON.parse('{"kind":"folder","folder":"__proto__"}');

      const state = readGraphViewState({ ...CAMERA, focus });

      expect(state?.focus).toStrictEqual({ kind: 'folder', folder: '__proto__' });
    });
  });

  describe('GIVEN a state with a saved folder value', () => {
    it.each([
      ['a folder key', 'apps', { folder: 'apps' }],
      ['the root key', '', { folder: '' }],
      ['__proto__', '__proto__', { folder: '__proto__' }],
      ['the number 7', null, { folder: 7 }],
      ['null', null, { folder: null }],
      ['missing', null, {}]
    ])('WHEN it is %s THEN folder reads %j', (_name, expected, saved) => {
      const state = readGraphViewState({ ...CAMERA, ...saved });

      expect(state?.folder).toBe(expected);
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

  describe('GIVEN a saved task view', () => {
    it('WHEN mode is tasks and the task is valid THEN both are kept', () => {
      const state = readGraphViewState(TASK_STATE);

      expect(state).toStrictEqual(TASK_STATE);
    });

    it('WHEN the task carries extra keys THEN they are stripped', () => {
      const task = { ...TASK, extra: 1, pan: PAN_WITH_EXTRA_KEY };

      const state = readGraphViewState({ ...TASK_STATE, task });

      expect(state?.task).toStrictEqual({ ...TASK, pan: PAN });
    });

    it.each([
      ['an old save', CAMERA],
      ['mode tasks with no task', { ...CAMERA, mode: 'tasks' }],
      ['mode tasks with a null task', { ...CAMERA, mode: 'tasks', task: null }],
      ["mode 'grid'", { ...CAMERA, mode: 'grid' }],
      ['a string task', { ...TASK_STATE, task: 'web#build' }]
    ])('WHEN it holds %s THEN mode reads packages and task null', (_name, raw) => {
      const state = readGraphViewState(raw);

      expect(state).toMatchObject(NO_TASK);
    });

    it.each([
      ['a chosen that is not an array', { chosen: 'web#build' }],
      ['a chosen with a number', { chosen: ['web#build', 3] }],
      ['a non-boolean capLifted', { capLifted: 'no' }],
      ['a numeric selected', { selected: 3 }],
      ['a missing selected', { selected: undefined }],
      ['a non-string search', { search: 5 }],
      ['a NaN zoom', { zoom: NaN }],
      ['a zero zoom', { zoom: 0 }],
      ['a pan without y', { pan: PAN_WITHOUT_Y }],
      ['an infinite pan', { pan: INFINITE_PAN }],
      ['a numeric layoutKey', { layoutKey: 1 }]
    ])('WHEN its task holds %s THEN mode reads packages and task null', (_name, bad) => {
      const task = { ...TASK, ...bad };

      const state = readGraphViewState({ ...TASK_STATE, task });

      expect(state).toMatchObject(NO_TASK);
    });

    it.each(['packages', 'grid'])('WHEN mode is %s and the task is valid THEN mode reads packages and the task is kept', (mode) => {
      const state = readGraphViewState({ ...TASK_STATE, mode });

      expect(state).toMatchObject({ mode: 'packages', task: TASK });
    });

    it('WHEN the task selects a task THEN the selection is kept', () => {
      const task = { ...TASK, selected: 'web#build' };

      const state = readGraphViewState({ ...TASK_STATE, task });

      expect(state?.task?.selected).toBe('web#build');
    });

    it.each([
      [9, 1],
      [-2, 1],
      ['x', 1],
      [2.5, 1],
      [0, 0],
      [3, 3],
      [5, 5]
    ])('WHEN its depth is %j THEN depth reads %j', (depth, expected) => {
      const task = { ...TASK, depth };

      const state = readGraphViewState({ ...TASK_STATE, task });

      expect(state?.task?.depth).toBe(expected);
    });
  });
});
