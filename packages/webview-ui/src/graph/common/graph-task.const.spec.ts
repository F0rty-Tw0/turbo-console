import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TASK_DEPTH,
  DEPENDENTS_DEPTH_LABEL,
  DEPENDENTS_LABEL,
  EMPTY_TASKS_TEXT,
  MAX_TASK_DEPTH,
  MIN_TASK_DEPTH,
  NEUTRAL_NAMING,
  NONE_SHOWN_TEXT,
  PACKAGES_MODE_LABEL,
  PACKAGES_MODE_TITLE,
  ROOT_TASKS_TITLE,
  ROOT_TASK_PACKAGE,
  SCRIPTS_BOX_CLASS,
  SCRIPTS_BOX_DASH_PX,
  SCRIPTS_BOX_PREFIX,
  SCRIPTS_BOX_TITLE,
  SEARCH_TASKS_LABEL,
  SHOW_ALL_TASKS_LABEL,
  SHOW_EVERY_TASK_LABEL,
  SHOW_TASKS_LABEL,
  SLOW_TASKS_TEXT,
  TASKS_MODE_LABEL,
  TASKS_MODE_TITLE,
  TASK_CAP,
  TASK_FOLDER_CLASS,
  UNKNOWN_TASKS_TEXT
} from './graph-task.const.ts';

describe('FEATURE: graph task constants', () => {
  it.each([
    ['the task cap', TASK_CAP, 300],
    ['the minimum dependents depth', MIN_TASK_DEPTH, 0],
    ['the maximum dependents depth', MAX_TASK_DEPTH, 5],
    ['the default dependents depth', DEFAULT_TASK_DEPTH, 1]
  ])('GIVEN %s WHEN it is read THEN it is the spec value', (_label, value, expected) => {
    expect(value).toBe(expected);
  });

  describe('GIVEN the Scripts box', () => {
    it('WHEN its id prefix is read THEN it is scripts:', () => {
      expect(SCRIPTS_BOX_PREFIX).toBe('scripts:');
    });

    it('WHEN its class is read THEN it is task-scripts', () => {
      expect(SCRIPTS_BOX_CLASS).toBe('task-scripts');
    });

    it('WHEN its frame dashes are read THEN they are 2 px on, 3 px off', () => {
      expect(SCRIPTS_BOX_DASH_PX).toStrictEqual([2, 3]);
    });
  });

  describe('GIVEN the task folder box', () => {
    it('WHEN its class is read THEN it is task-folder', () => {
      expect(TASK_FOLDER_CLASS).toBe('task-folder');
    });
  });

  describe('GIVEN the neutral task naming', () => {
    it('WHEN it is read THEN it is ungrouped with scopes shown and no labels or folders', () => {
      const neutral = { grouped: false, scopeShown: true, labels: new Map(), folders: new Map() };

      expect(NEUTRAL_NAMING).toStrictEqual(neutral);
    });
  });

  it.each([
    ['the Packages button', PACKAGES_MODE_LABEL, 'Packages'],
    ['the Packages button hover text', PACKAGES_MODE_TITLE, 'Show the package graph'],
    ['the Tasks button', TASKS_MODE_LABEL, 'Tasks'],
    ['the Tasks button hover text', TASKS_MODE_TITLE, 'Show the task graph'],
    ['the banner button', SHOW_ALL_TASKS_LABEL, 'Show all tasks'],
    ['the search field', SEARCH_TASKS_LABEL, 'Search tasks'],
    ['the depth field', DEPENDENTS_DEPTH_LABEL, 'Dependents depth'],
    ['the package action', SHOW_TASKS_LABEL, 'Show tasks'],
    ['the invalid request notice', UNKNOWN_TASKS_TEXT, 'Those tasks are not in this workspace'],
    ['the prompt button', SHOW_EVERY_TASK_LABEL, 'Show every task'],
    ['the over-cap warning', SLOW_TASKS_TEXT, 'Drawing more than 300 tasks can be slow.'],
    ['the root package of a task', ROOT_TASK_PACKAGE, '//'],
    ['the dependents heading', DEPENDENTS_LABEL, 'Dependents'],
    ['the empty dependents line', NONE_SHOWN_TEXT, 'None shown'],
    ['the title of a package Scripts box', SCRIPTS_BOX_TITLE, 'Scripts'],
    ['the title of the root tasks box', ROOT_TASKS_TITLE, 'Workspace root (//)'],
    [
      'the empty prompt',
      EMPTY_TASKS_TEXT,
      'Choose tasks to show: select a package and pick Show tasks, use Show in task graph on the details page, or run Turbo Console: Show Task Graph…'
    ]
  ])('GIVEN the copy of %s WHEN it is read THEN it is the spec text', (_label, text, expected) => {
    expect(text).toBe(expected);
  });
});
