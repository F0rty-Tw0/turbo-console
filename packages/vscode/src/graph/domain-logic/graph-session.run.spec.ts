import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { portsWith } from '../test/utils/graph-session.spec.util.ts';

type ReadySession = {
  readonly session: GraphSession;
  readonly ports: GraphPorts;
};

const loadedStore = (): RootStore => {
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);

  return store;
};

/** A started, shown session on `/ws` whose page has posted `ready`. */
const readySession = async (): Promise<ReadySession> => {
  const ports = portsWith(null);
  const session = new GraphSession('/ws', loadedStore(), ports, new RunStore());

  session.setVisible(true);
  session.start();
  await session.receive({ type: 'ready' });

  const ready: ReadySession = { session, ports };

  return ready;
};

const WEB_BUILD_ROW = { kind: 'task', root: '/ws', key: 'web#build', packageName: 'web' };

describe('FEATURE: graph session run and stop requests', () => {
  describe('GIVEN a ready session on /ws listing web#build', () => {
    it('WHEN the page posts runTask THEN the run command gets the host task row', async () => {
      const { session, ports } = await readySession();

      await session.receive({ type: 'runTask', taskId: 'web#build', noCache: false });

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', WEB_BUILD_ROW);
    });

    it('WHEN runTask forges a packageName THEN the host row still names web', async () => {
      const { session, ports } = await readySession();

      await session.receive({ type: 'runTask', taskId: 'web#build', noCache: false, packageName: 'evil' });

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', WEB_BUILD_ROW);
    });

    it('WHEN the page posts stopTask THEN the stop command gets the host task row', async () => {
      const { session, ports } = await readySession();

      await session.receive({ type: 'stopTask', taskId: 'web#build' });

      expect(ports.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.stopTask', WEB_BUILD_ROW);
    });

    it('WHEN runTask names a forged id THEN nothing runs and the drop is logged', async () => {
      const { session, ports } = await readySession();

      await session.receive({ type: 'runTask', taskId: 'evil#build', noCache: false });

      expect(ports.executeCommand).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Dropped a graph message'));
    });

    it('WHEN runTask carries a non-boolean noCache THEN the schema drops it and nothing runs', async () => {
      const { session, ports } = await readySession();

      await session.receive({ type: 'runTask', taskId: 'web#build', noCache: 'yes' });

      expect(ports.executeCommand).not.toHaveBeenCalled();
    });
  });
});
