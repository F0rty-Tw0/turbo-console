import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { routeRun } from './graph-run-route.ts';
import type { GraphRunRequest } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';

const LOADING_STATE: GraphState = { kind: 'loading' };

type RunCase = readonly [string, GraphRunRequest, string];

const RUN_CASES: RunCase[] = [
  ['runTask', { type: 'runTask', taskId: 'a#build', noCache: false }, 'turboConsole.runTask'],
  ['runTask with noCache', { type: 'runTask', taskId: 'a#build', noCache: true }, 'turboConsole.runTaskWithoutCache'],
  ['stopTask', { type: 'stopTask', taskId: 'a#build' }, 'turboConsole.stopTask']
];

const A_BUILD_ROW = { kind: 'task', root: '/ws', key: 'a#build', packageName: 'a' };

describe('FEATURE: routing a graph run request to the run commands', () => {
  describe('GIVEN a graph state listing a#build', () => {
    it.each(RUN_CASES)(
      'WHEN it is %s for a listed task THEN executeCommand gets the task row and true is returned',
      async (_label, request, command) => {
        const ports = graphPortsMock();

        const isHandled = await routeRun(request, GRAPH_STATE_STUB, ports, '/ws');

        expect(isHandled).toBe(true);
        expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith(command, A_BUILD_ROW);
      }
    );

    it('WHEN the request carries a forged packageName and root THEN the row still comes from the host', async () => {
      const ports = graphPortsMock();
      const forged = { type: 'runTask', taskId: 'a#build', noCache: false, packageName: 'evil', root: '/evil' } as const;

      await routeRun(forged, GRAPH_STATE_STUB, ports, '/ws');

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', A_BUILD_ROW);
    });

    it.each([['nope#build'], ['f']])('WHEN the id %s is not in tasks THEN nothing runs and false is returned', async (taskId) => {
      const ports = graphPortsMock();
      const request: GraphRunRequest = { type: 'runTask', taskId, noCache: false };

      const isHandled = await routeRun(request, GRAPH_STATE_STUB, ports, '/ws');

      expect(isHandled).toBe(false);
      expect(ports.executeCommand).not.toHaveBeenCalled();
    });

    it('WHEN executeCommand rejects THEN the failure is logged and true is returned', async () => {
      const ports = graphPortsMock();
      const request: GraphRunRequest = { type: 'stopTask', taskId: 'a#build' };

      vi.mocked(ports.executeCommand).mockRejectedValueOnce(new Error('boom'));

      const isHandled = await routeRun(request, GRAPH_STATE_STUB, ports, '/ws');

      expect(isHandled).toBe(true);
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('boom'));
    });
  });

  describe('GIVEN a state that is not a graph', () => {
    it('WHEN a task is run THEN false is returned and nothing runs', async () => {
      const ports = graphPortsMock();
      const request: GraphRunRequest = { type: 'runTask', taskId: 'a#build', noCache: false };

      const isHandled = await routeRun(request, LOADING_STATE, ports, '/ws');

      expect(isHandled).toBe(false);
      expect(ports.executeCommand).not.toHaveBeenCalled();
    });
  });
});
