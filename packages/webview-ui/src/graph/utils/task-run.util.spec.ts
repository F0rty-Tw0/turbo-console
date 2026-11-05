import { describe, expect, it } from 'vitest';

import { isLiveRun, runMessageOf, runStateOf, taskDetailsModelOf, taskWithId } from './task-run.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { LatestRuns, TaskDetailsModel, TaskOwners, TaskRuns } from '../common/task-details.type.ts';
import {
  API_BUILD_STUB,
  GRAPH_TASK_STUB,
  MORE_TASKS_STATE_STUB,
  TASK_CHAIN_STUB,
  WEB_BUILD_STUB,
  WEB_LINT_STUB
} from '../test/stubs/graph-task.stub.ts';
import { TASK_DETAILS_STUB } from '../test/stubs/task-details.stub.ts';

const RUNS: TaskRuns = { 'a#build': 'running', 'api#build': 'failed' };

const OWNERS: TaskOwners = { 'ui#build': 'web#build' };

const UNLISTED_OWNERS: TaskOwners = { 'ui#build': 'web#all' };

const UI_RUNNING: TaskRuns = { 'ui#build': 'running' };

const UI_CONTINUOUS: TaskRuns = { 'ui#build': 'continuous' };

const UI_PASSED: TaskRuns = { 'ui#build': 'passed' };

const UI_BUILD_TASK: GraphTask = { ...GRAPH_TASK_STUB, id: 'ui#build' };

const LATEST: LatestRuns = { runs: RUNS, owners: {} };

const RUNNING: TaskDetailsModel = { ...TASK_DETAILS_STUB, state: 'running' };

const PASSED: TaskDetailsModel = { ...RUNNING, state: 'passed' };

const CONTINUOUS: TaskDetailsModel = { ...RUNNING, state: 'continuous' };

const NOT_RUNNABLE_TASK: GraphTask = { ...GRAPH_TASK_STUB, isRunnable: false };

const NOT_RUNNABLE: TaskDetailsModel = { ...RUNNING, task: NOT_RUNNABLE_TASK };

/** `api#test`, a second direct dependent of `api#build`. */
const API_TEST: GraphTask = { ...API_BUILD_STUB, id: 'api#test', name: 'test', dependencies: ['api#build'] };

/** `api#test` first, then api#build, web#build → api#build, web#lint and web#test → web#build. */
const SHOWN_WITH_TESTS: GraphTask[] = [API_TEST, ...MORE_TASKS_STATE_STUB.tasks];

describe('FEATURE: task runs', () => {
  describe('GIVEN runStateOf over a runs map', () => {
    it('WHEN a task in the map is read THEN its state is returned', () => {
      const state = runStateOf(RUNS, 'api#build');

      expect(state).toBe('failed');
    });

    it('WHEN a task missing from the map is read THEN it has no state', () => {
      const state = runStateOf(RUNS, 'web#build');

      expect(state).toBeNull();
    });

    it('WHEN an inherited key is read THEN it has no state', () => {
      const state = runStateOf(RUNS, 'toString');

      expect(state).toBeNull();
    });
  });

  describe('GIVEN isLiveRun', () => {
    it.each([
      { state: 'running', expected: true },
      { state: 'continuous', expected: true },
      { state: 'passed', expected: false },
      { state: 'failed', expected: false },
      { state: 'stopped', expected: false },
      { state: 'failed-to-start', expected: false },
      { state: null, expected: false }
    ] as const)('WHEN the state is $state THEN it is live: $expected', ({ state, expected }) => {
      const isLive = isLiveRun(state);

      expect(isLive).toBe(expected);
    });
  });

  describe('GIVEN taskWithId over the chain', () => {
    it('WHEN web#build is looked up THEN it is found', () => {
      const task = taskWithId(TASK_CHAIN_STUB, 'web#build');

      expect(task).toBe(WEB_BUILD_STUB);
    });

    it('WHEN no id is looked up THEN nothing is found', () => {
      const task = taskWithId(TASK_CHAIN_STUB, null);

      expect(task).toBeUndefined();
    });
  });

  describe('GIVEN taskDetailsModelOf', () => {
    it('WHEN web#build is shown with api#build THEN its dependency and run state are read', () => {
      const model = taskDetailsModelOf(WEB_BUILD_STUB, TASK_CHAIN_STUB, LATEST, null);

      const dependencies = [API_BUILD_STUB];
      const expected: TaskDetailsModel = {
        task: WEB_BUILD_STUB,
        state: null,
        runOwner: null,
        dependencies,
        dependents: [],
        rootLabel: null
      };

      expect(model).toStrictEqual(expected);
    });

    it('WHEN api#build is not shown THEN web#build lists no dependency', () => {
      const shown = [WEB_BUILD_STUB, WEB_LINT_STUB];

      const model = taskDetailsModelOf(WEB_BUILD_STUB, shown, LATEST, null);

      expect(model.dependencies).toStrictEqual([]);
    });
  });

  describe('GIVEN taskDetailsModelOf with each task running and OWNERS naming ui#build alone', () => {
    it.each([
      { id: 'ui#build', expected: 'web#build' },
      { id: 'api#build', expected: null },
      { id: 'constructor', expected: null },
      { id: 'toString', expected: null },
      { id: '__proto__', expected: null }
    ])('WHEN $id is modelled THEN runOwner is $expected', ({ id, expected }) => {
      const task: GraphTask = { ...GRAPH_TASK_STUB, id };
      const runs: TaskRuns = { [id]: 'running' };

      const model = taskDetailsModelOf(task, TASK_CHAIN_STUB, { runs, owners: OWNERS }, null);

      expect(model.runOwner).toBe(expected);
    });
  });

  describe('GIVEN taskDetailsModelOf with ui#build owned by web#build', () => {
    it.each([
      { state: 'running', runs: UI_RUNNING, owners: OWNERS, expected: 'web#build' },
      { state: 'running', runs: UI_RUNNING, owners: UNLISTED_OWNERS, expected: 'web#all' },
      { state: 'continuous', runs: UI_CONTINUOUS, owners: OWNERS, expected: 'web#build' },
      { state: 'passed', runs: UI_PASSED, owners: OWNERS, expected: null },
      { state: null, runs: {}, owners: OWNERS, expected: null }
    ] as const)('WHEN ui#build is $state under $owners THEN runOwner is $expected', ({ runs, owners, expected }) => {
      const model = taskDetailsModelOf(UI_BUILD_TASK, TASK_CHAIN_STUB, { runs, owners }, null);

      expect(model.runOwner).toBe(expected);
    });
  });

  describe('GIVEN taskDetailsModelOf over api#test, the chain and web#test', () => {
    it.each([
      { id: 'api#build', expected: ['api#test', 'web#build'] },
      { id: 'web#build', expected: ['web#test'] },
      { id: 'web#test', expected: [] }
    ])('WHEN $id is modelled THEN its direct shown dependents are $expected in shown order', ({ id, expected }) => {
      const task = taskWithId(SHOWN_WITH_TESTS, id) ?? GRAPH_TASK_STUB;
      const model = taskDetailsModelOf(task, SHOWN_WITH_TESTS, LATEST, null);

      expect(model.dependents.map((dependent) => dependent.id)).toStrictEqual(expected);
    });

    it('WHEN web#test is not shown THEN web#build lists no dependent', () => {
      const shown = SHOWN_WITH_TESTS.filter((task) => task.id !== 'web#test');

      const model = taskDetailsModelOf(WEB_BUILD_STUB, shown, LATEST, null);

      expect(model.dependents).toStrictEqual([]);
    });
  });

  describe('GIVEN runMessageOf for a runnable running task', () => {
    it('WHEN Run is asked THEN runTask without noCache is the message', () => {
      const message = runMessageOf(RUNNING, 'run');

      expect(message).toStrictEqual({ type: 'runTask', taskId: 'a#build', noCache: false });
    });

    it('WHEN Run without cache is asked THEN runTask with noCache is the message', () => {
      const message = runMessageOf(RUNNING, 'runNoCache');

      expect(message).toStrictEqual({ type: 'runTask', taskId: 'a#build', noCache: true });
    });

    it('WHEN Stop is asked THEN stopTask is the message', () => {
      const message = runMessageOf(RUNNING, 'stop');

      expect(message).toStrictEqual({ type: 'stopTask', taskId: 'a#build' });
    });
  });

  describe('GIVEN runMessageOf for ui#build running under web#build', () => {
    const OWNED: TaskDetailsModel = { ...RUNNING, task: UI_BUILD_TASK, runOwner: 'web#build' };

    it('WHEN Stop is asked THEN stopTask names web#build', () => {
      const message = runMessageOf(OWNED, 'stop');

      expect(message).toStrictEqual({ type: 'stopTask', taskId: 'web#build' });
    });

    it('WHEN Run is asked THEN runTask names ui#build', () => {
      const message = runMessageOf(OWNED, 'run');

      expect(message).toStrictEqual({ type: 'runTask', taskId: 'ui#build', noCache: false });
    });

    it('WHEN Run without cache is asked THEN runTask names ui#build with noCache', () => {
      const message = runMessageOf(OWNED, 'runNoCache');

      expect(message).toStrictEqual({ type: 'runTask', taskId: 'ui#build', noCache: true });
    });

    describe('GIVEN the owner web#all is not a shown task', () => {
      const UNLISTED: TaskDetailsModel = { ...OWNED, runOwner: 'web#all' };

      it('WHEN Stop is asked THEN stopTask names web#all', () => {
        const message = runMessageOf(UNLISTED, 'stop');

        expect(message).toStrictEqual({ type: 'stopTask', taskId: 'web#all' });
      });
    });
  });

  it('GIVEN a continuous task WHEN Stop is asked THEN stopTask is the message', () => {
    const message = runMessageOf(CONTINUOUS, 'stop');

    expect(message).toStrictEqual({ type: 'stopTask', taskId: 'a#build' });
  });

  it('GIVEN a passed task WHEN Stop is asked THEN there is no message', () => {
    const message = runMessageOf(PASSED, 'stop');

    expect(message).toBeNull();
  });

  it('GIVEN a task that is not runnable WHEN Run without cache is asked THEN there is no message', () => {
    const message = runMessageOf(NOT_RUNNABLE, 'runNoCache');

    expect(message).toBeNull();
  });

  it('GIVEN no task shown WHEN Run is asked THEN there is no message', () => {
    const message = runMessageOf(null, 'run');

    expect(message).toBeNull();
  });
});
