import { describe, expect, it } from 'vitest';

import { locationCrumbsOf } from './location.util.ts';
import type { LocationCrumb, LocationState } from '../common/location.type.ts';

type Row = [title: string, state: LocationState, labels: string[], current: string];

const ROWS: Row[] = [
  ['package mode', { mode: 'packages', folder: null, taskPackage: null, taskCount: 0 }, ['Packages'], 'Packages'],
  ['folder focus', { mode: 'packages', folder: 'libs', taskPackage: null, taskCount: 0 }, ['Packages', 'libs'], 'libs'],
  [
    'task mode, one package',
    { mode: 'tasks', folder: null, taskPackage: 'app', taskCount: 4 },
    ['Packages', 'app', 'Tasks (4)'],
    'Tasks (4)'
  ],
  [
    'task mode, mixed packages',
    { mode: 'tasks', folder: null, taskPackage: null, taskCount: 4 },
    ['Packages', 'Tasks (4)'],
    'Tasks (4)'
  ],
  [
    'task mode ignores a stale folder',
    { mode: 'tasks', folder: 'libs', taskPackage: null, taskCount: 1 },
    ['Packages', 'Tasks (1)'],
    'Tasks (1)'
  ]
];

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
      const state: LocationState = { mode: 'packages', folder: '', taskPackage: null, taskCount: 0 };
      const crumbs = locationCrumbsOf(state);
      const folder: LocationCrumb = { kind: 'folder', label: '(root)', name: '', isCurrent: true };

      expect(crumbs[1]).toStrictEqual(folder);
    });
  });

  describe('GIVEN task mode on one package', () => {
    it('WHEN the crumbs are built THEN the package crumb names the package it reveals', () => {
      const state: LocationState = { mode: 'tasks', folder: null, taskPackage: 'app', taskCount: 2 };
      const crumbs = locationCrumbsOf(state);
      const kinds = crumbs.map((crumb) => crumb.kind);

      expect(kinds).toStrictEqual(['packages', 'package', 'tasks']);
      expect(crumbs[1]?.name).toBe('app');
    });
  });
});
