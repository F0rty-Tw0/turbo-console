import { describe, expect, it } from 'vitest';

import { folderRunOf, packageRunsOf, runClassOf, runMarkClassesOf, strongestRunOf } from './package-run.util.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { PackageRuns } from '../common/graph-page.type.ts';
import { RUN_PRECEDENCE } from '../common/graph-task.const.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';

type RankRow = { readonly states: GraphRunState[]; readonly expected: GraphRunState | null };

type MarkRow = { readonly state: GraphRunState | null; readonly expected: string[] };

const WEB_BUILD: GraphTask = { ...GRAPH_TASK_STUB, id: 'web#build', packageName: 'web' };

const WEB_TEST: GraphTask = { ...WEB_BUILD, id: 'web#test', name: 'test' };

const UI_BUILD: GraphTask = { ...GRAPH_TASK_STUB, id: 'ui#build', packageName: 'ui' };

const CONSTRUCTOR_BUILD: GraphTask = { ...GRAPH_TASK_STUB, id: 'constructor#build', packageName: 'constructor' };

const TASKS: GraphTask[] = [WEB_BUILD, WEB_TEST, UI_BUILD];

const NO_RUNS: TaskRuns = {};

const RANK_ROWS: RankRow[] = [
  { states: [], expected: null },
  { states: ['passed', 'running'], expected: 'running' },
  { states: ['continuous', 'running'], expected: 'running' },
  { states: ['continuous', 'failed'], expected: 'continuous' },
  { states: ['passed', 'failed'], expected: 'failed' },
  { states: ['failed-to-start', 'failed'], expected: 'failed' },
  { states: ['failed-to-start', 'passed'], expected: 'failed-to-start' },
  { states: ['passed', 'stopped'], expected: 'stopped' },
  { states: ['passed', 'passed'], expected: 'passed' }
];

const MARK_ROWS: MarkRow[] = [
  { state: null, expected: [] },
  { state: 'failed', expected: ['run-failed', 'package-run'] }
];

describe('FEATURE: package run state', () => {
  describe('GIVEN RUN_PRECEDENCE', () => {
    it('WHEN it is compared with RUN_STATES THEN it ranks every run state once', () => {
      const ranked = RUN_PRECEDENCE.toSorted();
      const states = RUN_STATES.toSorted();

      expect(ranked).toStrictEqual(states);
    });
  });

  describe('GIVEN runClassOf', () => {
    it('WHEN a state is named THEN the class starts with run-', () => {
      const className = runClassOf('failed-to-start');

      expect(className).toBe('run-failed-to-start');
    });
  });

  describe('GIVEN strongestRunOf', () => {
    it.each(RANK_ROWS)('WHEN $states are ranked THEN $expected wins', ({ states, expected }) => {
      const state = strongestRunOf(states);

      expect(state).toBe(expected);
    });
  });

  describe('GIVEN packageRunsOf over web (build, test) and ui (build)', () => {
    it('WHEN no task has a state THEN the map is empty', () => {
      const runs = packageRunsOf(NO_RUNS, TASKS);

      expect(runs.size).toBe(0);
    });

    it('WHEN web#build runs and web#test failed THEN web reads running and ui is absent', () => {
      const taskRuns: TaskRuns = { 'web#build': 'running', 'web#test': 'failed' };

      const runs = packageRunsOf(taskRuns, TASKS);

      expect([...runs]).toStrictEqual([['web', 'running']]);
    });

    it('WHEN the stronger task is listed first THEN the weaker one after it does not replace it', () => {
      const taskRuns: TaskRuns = { 'web#build': 'failed', 'web#test': 'passed' };

      const runs = packageRunsOf(taskRuns, TASKS);

      expect(runs.get('web')).toBe('failed');
    });

    it('WHEN web#test failed and web#build passed THEN web reads failed', () => {
      const taskRuns: TaskRuns = { 'web#build': 'passed', 'web#test': 'failed' };

      const runs = packageRunsOf(taskRuns, TASKS);

      expect(runs.get('web')).toBe('failed');
    });

    it('WHEN only the atom file web#build--a.ts has a state THEN web is absent', () => {
      const taskRuns: TaskRuns = { 'web#build--a.ts': 'running' };

      const runs = packageRunsOf(taskRuns, TASKS);

      expect(runs.size).toBe(0);
    });

    it('WHEN runs name an unlisted task api#build THEN no api key is made', () => {
      const taskRuns: TaskRuns = { 'api#build': 'running' };

      const runs = packageRunsOf(taskRuns, TASKS);

      expect(runs.has('api')).toBe(false);
    });

    it('WHEN the package constructor has a passed task THEN the map reads constructor passed', () => {
      const taskRuns: TaskRuns = { 'constructor#build': 'passed' };

      const runs = packageRunsOf(taskRuns, [CONSTRUCTOR_BUILD]);

      expect(runs).toBeInstanceOf(Map);
      expect(runs.get('constructor')).toBe('passed');
    });
  });

  describe('GIVEN folderRunOf over a package map', () => {
    const PACKAGE_RUNS: PackageRuns = new Map<string, GraphRunState>([
      ['web', 'running'],
      ['docs', 'passed']
    ]);

    it('WHEN one member runs and one passed THEN the folder reads running', () => {
      const state = folderRunOf(PACKAGE_RUNS, ['web', 'docs']);

      expect(state).toBe('running');
    });

    it('WHEN no member has a state THEN it reads null', () => {
      const state = folderRunOf(PACKAGE_RUNS, ['ui']);

      expect(state).toBeNull();
    });

    it('WHEN a name is not in the map THEN it is skipped', () => {
      const state = folderRunOf(PACKAGE_RUNS, ['ui', 'docs']);

      expect(state).toBe('passed');
    });
  });

  describe('GIVEN runMarkClassesOf', () => {
    it.each(MARK_ROWS)('WHEN the state is $state THEN the classes are $expected', ({ state, expected }) => {
      const classes = runMarkClassesOf(state);

      expect(classes).toStrictEqual(expected);
    });
  });
});
