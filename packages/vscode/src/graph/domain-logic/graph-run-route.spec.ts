import type { GraphReady, GraphState, GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { routeRun } from './graph-run-route.ts';
import type { RunDefinition, RunRequest, Runs } from '../../run/common/run.type.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { RUN_REQUEST_STUB } from '../../run/test/stubs/run.stub.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphRunRequest, RequestContext } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB, GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { feedsOf } from '../test/utils/graph-feeds.spec.util.ts';

const LOADING_STATE: GraphState = { kind: 'loading' };

/** A context on `/ws` over `ports`, with feeds on `runs` (a fresh store unless the spec passes one). */
const contextOf = (state: GraphState, ports: RequestContext['ports'], runs: Runs = new RunStore()): RequestContext => {
  const context: RequestContext = { state, root: '/ws', coordinator: undefined, ports, feeds: feedsOf(runs) };

  return context;
};

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

      await routeRun(request, contextOf(GRAPH_STATE_STUB, ports));

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith(command, A_BUILD_ROW);
    });

    it.each(RUN_CASES)('WHEN it is %s for a listed task THEN true is returned', async (_label, request) => {
      const ports = graphPortsMock();

      const isHandled = await routeRun(request, contextOf(GRAPH_STATE_STUB, ports));

      expect(isHandled).toBe(true);
    });

    it('WHEN the request carries a forged packageName and root THEN the row still comes from the host', async () => {
      const ports = graphPortsMock();
      const forged = { type: 'runTask', taskId: 'a#build', noCache: false, packageName: 'evil', root: '/evil' } as const;

      await routeRun(forged, contextOf(GRAPH_STATE_STUB, ports));

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', A_BUILD_ROW);
    });

    describe.each([['nope#build'], ['f']])('WHEN the id %s is not in tasks', (taskId) => {
      const request: GraphRunRequest = { type: 'runTask', taskId, noCache: false };

      it('THEN false is returned', async () => {
        const isHandled = await routeRun(request, contextOf(GRAPH_STATE_STUB, graphPortsMock()));

        expect(isHandled).toBe(false);
      });

      it('THEN nothing runs', async () => {
        const ports = graphPortsMock();

        await routeRun(request, contextOf(GRAPH_STATE_STUB, ports));

        expect(ports.executeCommand).not.toHaveBeenCalled();
      });
    });

    describe('WHEN executeCommand rejects', () => {
      it('THEN true is returned', async () => {
        const ports = graphPortsMock();

        vi.mocked(ports.executeCommand).mockRejectedValueOnce(new Error('boom'));

        const isHandled = await routeRun(STOP_A_BUILD, contextOf(GRAPH_STATE_STUB, ports));

        expect(isHandled).toBe(true);
      });

      it('THEN the failure is logged', async () => {
        const ports = graphPortsMock();

        vi.mocked(ports.executeCommand).mockRejectedValueOnce(new Error('boom'));
        await routeRun(STOP_A_BUILD, contextOf(GRAPH_STATE_STUB, ports));

        expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('boom'));
      });
    });
  });

  describe('GIVEN a graph state whose a#build is not runnable', () => {
    it('WHEN a run is asked THEN false is returned', async () => {
      const isHandled = await routeRun(RUN_A_BUILD, contextOf(UNRUNNABLE_STATE, graphPortsMock()));

      expect(isHandled).toBe(false);
    });

    it('WHEN a run is asked THEN nothing runs', async () => {
      const ports = graphPortsMock();

      await routeRun(RUN_A_BUILD, contextOf(UNRUNNABLE_STATE, ports));

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });

    it('WHEN a stop is asked THEN the stop command gets the task row', async () => {
      const ports = graphPortsMock();

      await routeRun(STOP_A_BUILD, contextOf(UNRUNNABLE_STATE, ports));

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.stopTask', A_BUILD_ROW);
    });
  });

  describe('GIVEN a state that is not a graph', () => {
    it('WHEN a task is run THEN false is returned', async () => {
      const isHandled = await routeRun(RUN_A_BUILD, contextOf(LOADING_STATE, graphPortsMock()));

      expect(isHandled).toBe(false);
    });

    it('WHEN a task is run THEN nothing runs', async () => {
      const ports = graphPortsMock();

      await routeRun(RUN_A_BUILD, contextOf(LOADING_STATE, ports));

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });
  });
});

const LINT_TASK: RunRequest['task'] = { ...TASK_NODE_STUB, id: 'turbo#lint' };

const LINT_REQUEST: RunRequest = { ...RUN_REQUEST_STUB, packageName: 'turbo', task: LINT_TASK };

const STOP_LINT: GraphRunRequest = { type: 'stopTask', taskId: 'turbo#lint' };

const RUN_LINT: GraphRunRequest = { type: 'runTask', taskId: 'turbo#lint', noCache: false };

const LINT_ROW = { kind: 'task', root: '/ws', key: 'turbo#lint', packageName: 'turbo' };

const runningStoreOf = (request: RunRequest): RunStore => {
  const store = new RunStore();

  store.tryStart(request, 1000);

  return store;
};

const endedStoreOf = (state: 'passed' | 'stopped'): RunStore => {
  const store = runningStoreOf(LINT_REQUEST);
  const definition: RunDefinition = { root: LINT_REQUEST.root, id: LINT_REQUEST.task.id };

  if (state === 'stopped') store.requestStop(definition);

  store.processEnded(definition, state === 'passed' ? 0 : 1, 2000);

  return store;
};

const emptyStoreOf = (): RunStore => new RunStore();

const passedStoreOf = (): RunStore => endedStoreOf('passed');

const stoppedStoreOf = (): RunStore => endedStoreOf('stopped');

describe('FEATURE: Stop on an owner the graph does not list (spec D15)', () => {
  describe('GIVEN an unlisted turbo#lint with a running entry of package turbo WHEN stopTask turbo#lint is routed', () => {
    it('THEN true is returned', async () => {
      const context = contextOf(GRAPH_STATE_STUB, graphPortsMock(), runningStoreOf(LINT_REQUEST));

      const isHandled = await routeRun(STOP_LINT, context);

      expect(isHandled).toBe(true);
    });

    it('THEN turboConsole.stopTask gets the entry row', async () => {
      const ports = graphPortsMock();

      await routeRun(STOP_LINT, contextOf(GRAPH_STATE_STUB, ports, runningStoreOf(LINT_REQUEST)));

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.stopTask', LINT_ROW);
    });
  });

  describe.each<[string, () => RunStore]>([
    ['no entry', emptyStoreOf],
    ['a passed entry', passedStoreOf],
    ['a stopped entry', stoppedStoreOf]
  ])('GIVEN an unlisted id with %s WHEN stopTask is routed', (_label, storeOf) => {
    it('THEN false is returned', async () => {
      const isHandled = await routeRun(STOP_LINT, contextOf(GRAPH_STATE_STUB, graphPortsMock(), storeOf()));

      expect(isHandled).toBe(false);
    });

    it('THEN no command runs', async () => {
      const ports = graphPortsMock();

      await routeRun(STOP_LINT, contextOf(GRAPH_STATE_STUB, ports, storeOf()));

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an unlisted id with a running entry WHEN runTask is routed', () => {
    it('THEN false is returned', async () => {
      const isHandled = await routeRun(RUN_LINT, contextOf(GRAPH_STATE_STUB, graphPortsMock(), runningStoreOf(LINT_REQUEST)));

      expect(isHandled).toBe(false);
    });

    it('THEN no command runs', async () => {
      const ports = graphPortsMock();

      await routeRun(RUN_LINT, contextOf(GRAPH_STATE_STUB, ports, runningStoreOf(LINT_REQUEST)));

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a running entry under another root WHEN stopTask is routed for /ws', () => {
    const otherRoot: RunRequest = { ...LINT_REQUEST, root: '/other' };

    it('THEN false is returned', async () => {
      const isHandled = await routeRun(STOP_LINT, contextOf(GRAPH_STATE_STUB, graphPortsMock(), runningStoreOf(otherRoot)));

      expect(isHandled).toBe(false);
    });

    it('THEN no command runs', async () => {
      const ports = graphPortsMock();

      await routeRun(STOP_LINT, contextOf(GRAPH_STATE_STUB, ports, runningStoreOf(otherRoot)));

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });
  });
});
