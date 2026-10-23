import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { postedShowTasksOf, postedTypesOf } from '../test/utils/graph-session-runs.spec.util.ts';
import { portsWith, postedOf } from '../test/utils/graph-session.spec.util.ts';

type ShownSession = {
  readonly session: GraphSession;
  readonly runs: RunStore;
  readonly ports: GraphPorts;
};

const loadedStore = (): RootStore => {
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);

  return store;
};

/** A started, shown session on `/ws` over a real `RunStore`; its page is not ready yet. */
const shownSession = (store: RootStore = loadedStore()): ShownSession => {
  const ports = portsWith(null);
  const runs = new RunStore();
  const session = new GraphSession('/ws', store, ports, runs);

  session.setVisible(true);
  session.start();

  const shown: ShownSession = { session, runs, ports };

  return shown;
};

const SHOW_A_BUILD = { type: 'showTasks', taskIds: ['a#build'] };

describe('FEATURE: graph session showTasks', () => {
  describe('GIVEN a shown session on /ws', () => {
    describe('WHEN showTasks is called after ready', () => {
      it('THEN the request is posted at once', async () => {
        const { session, ports } = shownSession();

        await session.receive({ type: 'ready' });
        session.showTasks(['a#build']);

        expect(postedShowTasksOf(ports)).toStrictEqual([SHOW_A_BUILD]);
      });

      it('THEN a second ready does not repeat it', async () => {
        const { session, ports } = shownSession();

        await session.receive({ type: 'ready' });
        session.showTasks(['a#build']);
        await session.receive({ type: 'ready' });

        expect(postedShowTasksOf(ports)).toStrictEqual([SHOW_A_BUILD]);
      });
    });

    describe('WHEN showTasks is called before ready', () => {
      it('THEN nothing is posted until ready', () => {
        const { session, ports } = shownSession();

        session.showTasks(['a#build']);

        expect(postedOf(ports)).toStrictEqual([]);
      });

      it('THEN ready posts the state, the runs, then the request', async () => {
        const { session, ports } = shownSession();

        session.showTasks(['a#build']);
        await session.receive({ type: 'ready' });

        expect(postedTypesOf(ports)).toStrictEqual(['state', 'runs', 'showTasks']);
      });

      it('THEN a second ready does not repeat the request', async () => {
        const { session, ports } = shownSession();

        session.showTasks(['a#build']);
        await session.receive({ type: 'ready' });
        await session.receive({ type: 'ready' });

        expect(postedShowTasksOf(ports)).toStrictEqual([SHOW_A_BUILD]);
      });
    });

    it('WHEN showTasks is called twice while hidden THEN one request with the second ids follows the reveal and ready', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      session.setVisible(false);
      session.showTasks(['a#build']);
      session.showTasks(['web#build', 'web#lint']);
      session.setVisible(true);
      await session.receive({ type: 'ready' });

      expect(postedShowTasksOf(ports)).toStrictEqual([{ type: 'showTasks', taskIds: ['web#build', 'web#lint'] }]);
    });

    it('WHEN the session is disposed THEN showTasks posts nothing', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      session.dispose();
      session.showTasks(['a#build']);

      expect(postedShowTasksOf(ports)).toStrictEqual([]);
    });
  });

  describe('GIVEN a ready session on a root that is still loading', () => {
    it('WHEN showTasks is called THEN nothing is posted besides the loading state and its map', async () => {
      const { session, ports } = shownSession(new RootStore());

      await session.receive({ type: 'ready' });
      session.showTasks(['a#build']);

      expect(postedTypesOf(ports)).toStrictEqual(['state', 'runs']);
    });

    it('WHEN the graph arrives THEN the request follows the graph state and its map', async () => {
      const store = new RootStore();
      const { session, ports } = shownSession(store);

      await session.receive({ type: 'ready' });
      session.showTasks(['a#build']);
      store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
      store.apply('/ws', GRAPH_LOADED_STUB);

      expect(postedTypesOf(ports)).toStrictEqual(['state', 'runs', 'state', 'runs', 'showTasks']);
    });
  });

  describe('GIVEN a shown session on a single-package root', () => {
    it('WHEN showTasks is called THEN nothing is posted or held and the request is logged once', async () => {
      const store = loadedStore();
      const singleModel = { ...GRAPH_LOADED_STUB.model, singlePackage: true };

      store.apply('/ws', { ...GRAPH_LOADED_STUB, model: singleModel });

      const { session, ports } = shownSession(store);

      session.showTasks(['a#build']);
      await session.receive({ type: 'ready' });
      await session.receive({ type: 'ready' });

      expect(postedShowTasksOf(ports)).toStrictEqual([]);
      expect(ports.log).toHaveBeenCalledOnce();
    });
  });
});
