import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphSession } from './graph-session.ts';
import type { LoadedModel } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOADED_MODEL_STUB } from '../../roots/test/stubs/root.stub.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import type { AtomsFake } from '../test/common/graph.type.ts';
import { ATOM_UMBRELLA_TASK_STUB, GRAPH_ATOM_LOOKUP_STUB, GRAPH_ATOM_MODEL_STUB } from '../test/stubs/graph-atom-model.stub.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { atomsFake, feedsOf } from '../test/utils/graph-feeds.spec.util.ts';
import { postedAtomsOf, postedTypesOf } from '../test/utils/graph-session-runs.spec.util.ts';
import { portsWith } from '../test/utils/graph-session.spec.util.ts';

const ATOM_LOADED: LoadedModel = { ...LOADED_MODEL_STUB, model: GRAPH_ATOM_MODEL_STUB };

const storeOf = (loaded: LoadedModel): RootStore => {
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', loaded);

  return store;
};

describe('FEATURE: graph session atoms feed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a shown session on a root whose model holds an atom group', () => {
    let ports: GraphPorts;
    let fake: AtomsFake;
    let session: GraphSession;

    beforeEach(() => {
      ports = portsWith(null);
      fake = atomsFake(GRAPH_ATOM_LOOKUP_STUB);
      session = new GraphSession('/ws', storeOf(ATOM_LOADED), ports, feedsOf(new RunStore(), fake.atoms));
      session.setVisible(true);
      session.start();
    });

    it('WHEN the page is ready THEN the posts are state, runs, atoms in that order', async () => {
      await session.receive({ type: 'ready' });

      expect(postedTypesOf(ports)).toStrictEqual(['state', 'runs', 'atoms']);
    });

    it('WHEN a showTasks request is held until the page is ready THEN it is posted after the atoms', async () => {
      session.show({ type: 'showTasks', taskIds: [ATOM_UMBRELLA_TASK_STUB.id] });
      await session.receive({ type: 'ready' });

      expect(postedTypesOf(ports)).toStrictEqual(['state', 'runs', 'atoms', 'showTasks']);
    });

    it('WHEN a load of the package changes THEN one atoms message follows after the coalesce window', async () => {
      await session.receive({ type: 'ready' });
      fake.changed('/ws', '@fx/e2e');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedAtomsOf(ports)).toHaveLength(2);
    });

    it('WHEN the page sends shownUmbrellas for the umbrella THEN the package load is requested', async () => {
      await session.receive({ type: 'ready' });
      await session.receive({ type: 'shownUmbrellas', ids: [ATOM_UMBRELLA_TASK_STUB.id] });

      expect(fake.childrenRequested).toHaveBeenCalledExactlyOnceWith('/ws', '@fx/e2e');
    });

    it('WHEN the session is disposed THEN the atoms listener is removed', () => {
      session.dispose();

      expect(fake.listenerCount()).toBe(0);
    });
  });

  describe('GIVEN a shown session on a root without atom groups', () => {
    it('WHEN the page is ready THEN no atoms message is posted', async () => {
      const ports = portsWith(null);
      const session = new GraphSession('/ws', storeOf(GRAPH_LOADED_STUB), ports, feedsOf(new RunStore()));

      session.setVisible(true);
      session.start();
      await session.receive({ type: 'ready' });

      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });
  });
});
