import { describe, expect, it } from 'vitest';

import { locationCrumbsOf } from './location.util.ts';
import { NO_NAMES, ROOT_TASKS_TITLE } from '../common/graph-task.const.ts';
import type { LocationCrumb, LocationState } from '../common/location.type.ts';

type Row = [title: string, state: LocationState, labels: string[], current: string];

const ROWS: Row[] = [
  [
    'package mode',
    { mode: 'packages', folder: null, taskPackage: null, taskCount: 0, isSinglePackage: false, labels: NO_NAMES },
    ['Packages'],
    'Packages'
  ],
  [
    'folder focus',
    { mode: 'packages', folder: 'libs', taskPackage: null, taskCount: 0, isSinglePackage: false, labels: NO_NAMES },
    ['Packages', 'libs'],
    'libs'
  ],
  [
    'task mode, one package',
    { mode: 'tasks', folder: null, taskPackage: 'app', taskCount: 4, isSinglePackage: false, labels: NO_NAMES },
    ['Packages', 'app', 'Tasks (4)'],
    'Tasks (4)'
  ],
  [
    'task mode, mixed packages',
    { mode: 'tasks', folder: null, taskPackage: null, taskCount: 4, isSinglePackage: false, labels: NO_NAMES },
    ['Packages', 'Tasks (4)'],
    'Tasks (4)'
  ],
  [
    'task mode ignores a stale folder',
    { mode: 'tasks', folder: 'libs', taskPackage: null, taskCount: 1, isSinglePackage: false, labels: NO_NAMES },
    ['Packages', 'Tasks (1)'],
    'Tasks (1)'
  ],
  [
    'a single package, which has no package mode',
    { mode: 'tasks', folder: null, taskPackage: null, taskCount: 3, isSinglePackage: true, labels: NO_NAMES },
    ['Tasks (3)'],
    'Tasks (3)'
  ]
];

const ROOT_STATE: LocationState = {
  mode: 'tasks',
  folder: null,
  taskPackage: '//',
  taskCount: 1,
  isSinglePackage: false,
  labels: NO_NAMES
};

const labelOf = (crumb: LocationCrumb): string => crumb.label;

describe('FEATURE: locationCrumbsOf', () => {
  describe.each(ROWS)('GIVEN %s', (_title, state, labels, current) => {
    it('WHEN the crumbs are built THEN their labels follow the mode, and only the last is current', () => {
      const crumbs = locationCrumbsOf(state);
      const currents = crumbs.filter((crumb) => crumb.isCurrent);

      expect(crumbs.map(labelOf)).toStrictEqual(labels);
      expect(currents.map(labelOf)).toStrictEqual([current]);
    });
  });

  describe('GIVEN the root folder focused', () => {
    it('WHEN the crumbs are built THEN the folder crumb reads its title and keeps its key as the name', () => {
      const state: LocationState = {
        mode: 'packages',
        folder: '',
        taskPackage: null,
        taskCount: 0,
        isSinglePackage: false,
        labels: NO_NAMES
      };
      const crumbs = locationCrumbsOf(state);
      const folder: LocationCrumb = { kind: 'folder', label: '(root)', name: '', isCurrent: true };

      expect(crumbs[1]).toStrictEqual(folder);
    });
  });

  describe('GIVEN task mode on one package', () => {
    it('WHEN the crumbs are built THEN the package crumb names the package it reveals', () => {
      const state: LocationState = {
        mode: 'tasks',
        folder: null,
        taskPackage: 'app',
        taskCount: 2,
        isSinglePackage: false,
        labels: NO_NAMES
      };
      const crumbs = locationCrumbsOf(state);
      const kinds = crumbs.map((crumb) => crumb.kind);

      expect(kinds).toStrictEqual(['packages', 'package', 'tasks']);
      expect(crumbs[1]?.name).toBe('app');
    });
  });

  describe('GIVEN task mode on the package @org/x labelled x', () => {
    it('WHEN the crumbs are built THEN the package crumb reads x and still names @org/x', () => {
      const state: LocationState = { ...ROOT_STATE, taskPackage: '@org/x', labels: new Map([['@org/x', 'x']]) };
      const crumbs = locationCrumbsOf(state);
      const owner: LocationCrumb = { kind: 'package', label: 'x', name: '@org/x', isCurrent: false };

      expect(crumbs[1]).toStrictEqual(owner);
    });
  });

  describe('GIVEN task mode on the root //', () => {
    it('WHEN the crumbs are built THEN they are Packages, the root crumb and Tasks (1)', () => {
      const crumbs = locationCrumbsOf(ROOT_STATE);
      const root: LocationCrumb = { kind: 'root', label: ROOT_TASKS_TITLE, name: '', isCurrent: false };

      expect(crumbs.map(labelOf)).toStrictEqual(['Packages', ROOT_TASKS_TITLE, 'Tasks (1)']);
      expect(crumbs[1]).toStrictEqual(root);
    });

    it('WHEN the repo is a single package THEN the trail is Tasks (1) alone', () => {
      const crumbs = locationCrumbsOf({ ...ROOT_STATE, isSinglePackage: true });

      expect(crumbs.map(labelOf)).toStrictEqual(['Tasks (1)']);
    });
  });
});
