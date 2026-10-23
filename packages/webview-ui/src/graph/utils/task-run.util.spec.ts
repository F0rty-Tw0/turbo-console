import { describe, expect, it } from 'vitest';

import { runMessageOf, runStateOf, taskDetailsModelOf, taskWithId } from './task-run.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskDetailsModel, TaskRuns } from '../common/task-details.type.ts';
import { API_BUILD_STUB, GRAPH_TASK_STUB, TASK_CHAIN_STUB, WEB_BUILD_STUB, WEB_LINT_STUB } from '../test/stubs/graph-task.stub.ts';

const RUNS: TaskRuns = { 'a#build': 'running', 'api#build': 'failed' };

const RUNNING: TaskDetailsModel = { task: GRAPH_TASK_STUB, state: 'running', dependencies: [] };

const PASSED: TaskDetailsModel = { ...RUNNING, state: 'passed' };

const NOT_RUNNABLE_TASK: GraphTask = { ...GRAPH_TASK_STUB, isRunnable: false };

const NOT_RUNNABLE: TaskDetailsModel = { ...RUNNING, task: NOT_RUNNABLE_TASK };

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
      const model = taskDetailsModelOf(WEB_BUILD_STUB, TASK_CHAIN_STUB, RUNS);

      const dependencies = [API_BUILD_STUB];
      const expected: TaskDetailsModel = { task: WEB_BUILD_STUB, state: null, dependencies };

      expect(model).toStrictEqual(expected);
    });

    it('WHEN api#build is not shown THEN web#build lists no dependency', () => {
      const shown = [WEB_BUILD_STUB, WEB_LINT_STUB];

      const model = taskDetailsModelOf(WEB_BUILD_STUB, shown, RUNS);

      expect(model.dependencies).toStrictEqual([]);
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
