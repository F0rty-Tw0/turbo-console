import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { isRequestMessage, requestHandledOf } from './graph-requests.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { SHARED_ATOMS_STUB } from '../../tree/test/stubs/shared-atoms.stub.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphRequestMessage, RequestContext } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import {
  ATOM_E2E_PACKAGE_STUB,
  ATOM_FILE_A_TASK_STUB,
  ATOM_UMBRELLA_TASK_STUB,
  GRAPH_ATOM_MODEL_STUB,
  GRAPH_ATOM_UNLOADED_VIEW_STUB
} from '../test/stubs/graph-atom-model.stub.ts';
import { GRAPH_STATE_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';
import { atomsFake } from '../test/utils/graph-feeds.spec.util.ts';
import { graphStateOf } from '../utils/graph-state.util.ts';

const ERROR_STATE: GraphState = { kind: 'error', message: 'failed' };
const LOADING_STATE: GraphState = { kind: 'loading' };

const RELOAD: GraphRequestMessage = { type: 'reload' };
const OPEN_WEB: GraphRequestMessage = { type: 'openDetails', packageName: 'web' };
const OPEN_GONE: GraphRequestMessage = { type: 'openDetails', packageName: 'gone' };
const RUN_A_BUILD: GraphRequestMessage = { type: 'runTask', taskId: 'a#build', noCache: false };
const STOP_A_BUILD: GraphRequestMessage = { type: 'stopTask', taskId: 'a#build' };
const SMOKE_ATOM: NonNullable<TaskNode['atom']> = { group: 'smoke', isLive: false };
const SMOKE_UMBRELLA: TaskNode = {
  ...TASK_NODE_STUB,
  id: '@fx/e2e#smoke',
  name: 'smoke',
  kind: 'atom-umbrella',
  atom: SMOKE_ATOM
};
const SMOKE_FILE: TaskNode = {
  ...TASK_NODE_STUB,
  id: '@fx/e2e#smoke--x.spec.ts',
  name: 'smoke--x.spec.ts',
  kind: 'atom-file',
  atom: SMOKE_ATOM
};
const TWO_GROUP_PACKAGE: PackageNode = {
  ...ATOM_E2E_PACKAGE_STUB,
  tasks: [...ATOM_E2E_PACKAGE_STUB.tasks, SMOKE_UMBRELLA, SMOKE_FILE]
};
const TWO_GROUP_MODEL: WorkspaceModel = { ...GRAPH_ATOM_MODEL_STUB, packages: [TWO_GROUP_PACKAGE] };
const TWO_GROUP_STATE = graphStateOf(TWO_GROUP_MODEL, NO_LAYOUT_CACHES_STUB);
const SHOWN_UMBRELLAS: GraphRequestMessage = {
  type: 'shownUmbrellas',
  ids: [ATOM_UMBRELLA_TASK_STUB.id, SMOKE_UMBRELLA.id, 'gone#nothing', ATOM_FILE_A_TASK_STUB.id]
};

const contextOf = (state: GraphState, atoms: RequestContext['atoms'] = SHARED_ATOMS_STUB): RequestContext => {
  const context: RequestContext = { state, root: '/ws', coordinator: coordinatorMock(), ports: graphPortsMock(), atoms };

  return context;
};

describe('FEATURE: graph request messages', () => {
  describe('GIVEN a message type', () => {
    it.each([[RELOAD], [OPEN_WEB], [RUN_A_BUILD], [STOP_A_BUILD], [SHOWN_UMBRELLAS]])(
      'WHEN it is %j THEN it is a request',
      (message) => {
        expect(isRequestMessage(message)).toBe(true);
      }
    );

    it.each([[{ type: 'ready' }], [{ type: 'layoutDone', engine: 'elk', ms: 1 }]] as const)(
      'WHEN it is %j THEN it is not a request',
      (message) => {
        expect(isRequestMessage(message)).toBe(false);
      }
    );
  });
});

describe('FEATURE: graph request handling', () => {
  describe('GIVEN a reload on an error state', () => {
    it('WHEN it is handled THEN the coordinator is asked to refresh', async () => {
      const context = contextOf(ERROR_STATE);

      await requestHandledOf(RELOAD, context);

      expect(context.coordinator?.request).toHaveBeenCalledExactlyOnceWith('refresh');
    });

    it('WHEN it is handled THEN true is returned', async () => {
      const isHandled = await requestHandledOf(RELOAD, contextOf(ERROR_STATE));

      expect(isHandled).toBe(true);
    });
  });

  describe('GIVEN a reload on a state that is not an error', () => {
    it('WHEN it is handled THEN false is returned', async () => {
      const isHandled = await requestHandledOf(RELOAD, contextOf(GRAPH_STATE_STUB));

      expect(isHandled).toBe(false);
    });

    it('WHEN it is handled THEN the coordinator is not asked', async () => {
      const context = contextOf(GRAPH_STATE_STUB);

      await requestHandledOf(RELOAD, context);

      expect(context.coordinator?.request).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN openDetails for a listed package', () => {
    it('WHEN it is handled THEN the details are opened', async () => {
      const context = contextOf(GRAPH_STATE_STUB);

      await requestHandledOf(OPEN_WEB, context);

      expect(context.ports.openDetails).toHaveBeenCalledExactlyOnceWith('web');
    });

    it('WHEN it is handled THEN true is returned', async () => {
      const isHandled = await requestHandledOf(OPEN_WEB, contextOf(GRAPH_STATE_STUB));

      expect(isHandled).toBe(true);
    });

    describe('WHEN openDetails rejects', () => {
      it('THEN the failure is logged', async () => {
        const context = contextOf(GRAPH_STATE_STUB);

        vi.mocked(context.ports.openDetails).mockRejectedValueOnce(new Error('boom'));
        await requestHandledOf(OPEN_WEB, context);

        expect(context.ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('boom'));
      });

      it('THEN true is returned', async () => {
        const context = contextOf(GRAPH_STATE_STUB);

        vi.mocked(context.ports.openDetails).mockRejectedValueOnce(new Error('boom'));

        const isHandled = await requestHandledOf(OPEN_WEB, context);

        expect(isHandled).toBe(true);
      });
    });
  });

  describe('GIVEN openDetails for a package that is not listed', () => {
    it('WHEN it is handled THEN false is returned', async () => {
      const isHandled = await requestHandledOf(OPEN_GONE, contextOf(GRAPH_STATE_STUB));

      expect(isHandled).toBe(false);
    });

    it('WHEN it is handled THEN no details are opened', async () => {
      const context = contextOf(GRAPH_STATE_STUB);

      await requestHandledOf(OPEN_GONE, context);

      expect(context.ports.openDetails).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN openDetails on a state that is not a graph', () => {
    it('WHEN it is handled THEN false is returned', async () => {
      const isHandled = await requestHandledOf(OPEN_WEB, contextOf(LOADING_STATE));

      expect(isHandled).toBe(false);
    });
  });

  describe('GIVEN a runTask or stopTask for a listed task', () => {
    it('WHEN runTask is handled THEN the run command is executed', async () => {
      const context = contextOf(GRAPH_STATE_STUB);

      await requestHandledOf(RUN_A_BUILD, context);

      expect(context.ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', expect.anything());
    });

    it('WHEN stopTask is handled THEN the stop command is executed', async () => {
      const context = contextOf(GRAPH_STATE_STUB);

      await requestHandledOf(STOP_A_BUILD, context);

      expect(context.ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.stopTask', expect.anything());
    });

    it('WHEN runTask is handled on a loading state THEN false is returned', async () => {
      const isHandled = await requestHandledOf(RUN_A_BUILD, contextOf(LOADING_STATE));

      expect(isHandled).toBe(false);
    });
  });
});

describe('FEATURE: graph shownUmbrellas request', () => {
  describe('GIVEN a graph state with two umbrellas of one package', () => {
    it('WHEN it names both, a file and an unknown id THEN childrenRequested(root, package) runs once', async () => {
      const { atoms, childrenRequested } = atomsFake(() => GRAPH_ATOM_UNLOADED_VIEW_STUB);

      await requestHandledOf(SHOWN_UMBRELLAS, contextOf(TWO_GROUP_STATE, atoms));

      expect(childrenRequested).toHaveBeenCalledExactlyOnceWith('/ws', '@fx/e2e');
    });

    it('WHEN it names both THEN the message is handled', async () => {
      const isHandled = await requestHandledOf(SHOWN_UMBRELLAS, contextOf(TWO_GROUP_STATE));

      expect(isHandled).toBe(true);
    });

    it('WHEN it names only unknown ids THEN nothing is requested', async () => {
      const { atoms, childrenRequested } = atomsFake(() => GRAPH_ATOM_UNLOADED_VIEW_STUB);

      await requestHandledOf({ type: 'shownUmbrellas', ids: ['gone#nothing'] }, contextOf(TWO_GROUP_STATE, atoms));

      expect(childrenRequested).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a state that is not a graph', () => {
    it('WHEN it names an umbrella THEN the message is not handled', async () => {
      const isHandled = await requestHandledOf(SHOWN_UMBRELLAS, contextOf(LOADING_STATE));

      expect(isHandled).toBe(false);
    });
  });
});
