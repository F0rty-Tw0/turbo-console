import type { GraphReady, GraphState, GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { routeRun } from './graph-run-route.ts';
import type { GraphRunRequest } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB, GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';

const LOADING_STATE: GraphState = { kind: 'loading' };

const unrunnableOf = (task: GraphTask): GraphTask => {
  const unrunnable: GraphTask = { ...task, isRunnable: false };

  return unrunnable;
};

const UNRUNNABLE_TASKS = GRAPH_TASKS_STUB.map(unrunnableOf);

const UNRUNNABLE_STATE: GraphReady = { ...GRAPH_STATE_STUB, tasks: UNRUNNABLE_TASKS };

type RunCase = readonly [string, GraphRunRequest, string];

const RUN_CASES: RunCase[] = [
  ['runTask', { type: 'runTask', taskId: 'a#build', noCache: false }, 'turboConsole.runTask'],
  ['runTask with noCache', { type: 'runTask', taskId: 'a#build', noCache: true }, 'turboConsole.runTaskWithoutCache'],
  ['stopTask', { type: 'stopTask', taskId: 'a#build' }, 'turboConsole.stopTask']
];

const A_BUILD_ROW = { kind: 'task', root: '/ws', key: 'a#build', packageName: 'a' };

const RUN_A_BUILD: GraphRunRequest = { type: 'runTask', taskId: 'a#build', noCache: false };

const STOP_A_BUILD: GraphRunRequest = { type: 'stopTask', taskId: 'a#build' };

describe('FEATURE: routing a graph run request to the run commands', () => {
  describe('GIVEN a graph state listing a#build', () => {
    it.each(RUN_CASES)('WHEN it is %s for a listed task THEN executeCommand gets the task row', async (_label, request, command) => {
      const ports = graphPortsMock();

      await routeRun(request, GRAPH_STATE_STUB, ports, '/ws');

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith(command, A_BUILD_ROW);
    });

    it.each(RUN_CASES)('WHEN it is %s for a listed task THEN true is returned', async (_label, request) => {
      const ports = graphPortsMock();

      const isHandled = await routeRun(request, GRAPH_STATE_STUB, ports, '/ws');

      expect(isHandled).toBe(true);
    });

    it('WHEN the request carries a forged packageName and root THEN the row still comes from the host', async () => {
      const ports = graphPortsMock();
      const forged = { type: 'runTask', taskId: 'a#build', noCache: false, packageName: 'evil', root: '/evil' } as const;

      await routeRun(forged, GRAPH_STATE_STUB, ports, '/ws');

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', A_BUILD_ROW);
    });

    describe.each([['nope#build'], ['f']])('WHEN the id %s is not in tasks', (taskId) => {
      const request: GraphRunRequest = { type: 'runTask', taskId, noCache: false };

      it('THEN false is returned', async () => {
        const isHandled = await routeRun(request, GRAPH_STATE_STUB, graphPortsMock(), '/ws');

        expect(isHandled).toBe(false);
      });

      it('THEN nothing runs', async () => {
        const ports = graphPortsMock();

        await routeRun(request, GRAPH_STATE_STUB, ports, '/ws');

        expect(ports.executeCommand).not.toHaveBeenCalled();
      });
    });

    describe('WHEN executeCommand rejects', () => {
      it('THEN true is returned', async () => {
        const ports = graphPortsMock();

        vi.mocked(ports.executeCommand).mockRejectedValueOnce(new Error('boom'));

        const isHandled = await routeRun(STOP_A_BUILD, GRAPH_STATE_STUB, ports, '/ws');

        expect(isHandled).toBe(true);
      });

      it('THEN the failure is logged', async () => {
        const ports = graphPortsMock();

        vi.mocked(ports.executeCommand).mockRejectedValueOnce(new Error('boom'));
        await routeRun(STOP_A_BUILD, GRAPH_STATE_STUB, ports, '/ws');

        expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('boom'));
      });
    });
  });

  describe('GIVEN a graph state whose a#build is not runnable', () => {
    it('WHEN a run is asked THEN false is returned', async () => {
      const isHandled = await routeRun(RUN_A_BUILD, UNRUNNABLE_STATE, graphPortsMock(), '/ws');

      expect(isHandled).toBe(false);
    });

    it('WHEN a run is asked THEN nothing runs', async () => {
      const ports = graphPortsMock();

      await routeRun(RUN_A_BUILD, UNRUNNABLE_STATE, ports, '/ws');

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });

    it('WHEN a stop is asked THEN the stop command gets the task row', async () => {
      const ports = graphPortsMock();

      await routeRun(STOP_A_BUILD, UNRUNNABLE_STATE, ports, '/ws');

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.stopTask', A_BUILD_ROW);
    });
  });

  describe('GIVEN a state that is not a graph', () => {
    it('WHEN a task is run THEN false is returned', async () => {
      const isHandled = await routeRun(RUN_A_BUILD, LOADING_STATE, graphPortsMock(), '/ws');

      expect(isHandled).toBe(false);
    });

    it('WHEN a task is run THEN nothing runs', async () => {
      const ports = graphPortsMock();

      await routeRun(RUN_A_BUILD, LOADING_STATE, ports, '/ws');

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });
  });
});
