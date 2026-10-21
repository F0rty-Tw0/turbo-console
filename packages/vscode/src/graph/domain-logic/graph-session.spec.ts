import { describe, expect, it, vi } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import {
  GRAPH_HASH_STUB,
  GRAPH_LOADED_STUB,
  GRAPH_STATE_STUB,
  GROWN_LOADED_STUB,
  POSITIONS_STUB
} from '../test/stubs/graph-model.stub.ts';
import { lastStateOf, portsWith, postedStatesOf } from '../test/utils/graph-session.spec.util.ts';

const OTHER_FOLDER = { root: '/other', name: 'other' };
const STATE_CACHE = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB };
const OLD_CACHE = { hash: 'old', positions: POSITIONS_STUB };

type ShownSession = {
  readonly session: GraphSession;
  readonly store: RootStore;
  readonly ports: GraphPorts;
};

const emptyStore = (): RootStore => {
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());

  return store;
};

const loadedStore = (): RootStore => {
  const store = emptyStore();

  store.apply('/ws', GRAPH_LOADED_STUB);

  return store;
};

/** A started, shown session on `/ws`; `cached` seeds its layout cache. */
const shownSession = (cached: GraphLayoutCacheEntry | null = null, store: RootStore = loadedStore()): ShownSession => {
  const ports = portsWith(cached);
  const session = new GraphSession('/ws', store, ports);

  session.setVisible(true);
  session.start();

  const shown: ShownSession = { session, store, ports };

  return shown;
};

describe('FEATURE: graph session', () => {
  describe('GIVEN a shown session on a loaded root', () => {
    it('WHEN the page is ready THEN one graph state is posted with no positions', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });

      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'state', state: GRAPH_STATE_STUB });
    });

    it('WHEN the model changes before ready THEN nothing is posted', () => {
      const { store, ports } = shownSession();

      store.apply('/ws', GROWN_LOADED_STUB);

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN the model changes after ready THEN a second state is posted with the new package', async () => {
      const { session, store, ports } = shownSession();

      await session.receive({ type: 'ready' });

      store.apply('/ws', GROWN_LOADED_STUB);

      expect(lastStateOf(ports).packages).toContain('zed');
      expect(ports.post).toHaveBeenCalledTimes(2);
    });

    it('WHEN the same model is applied again THEN no second state is posted', async () => {
      const { session, store, ports } = shownSession();

      await session.receive({ type: 'ready' });

      store.apply('/ws', GRAPH_LOADED_STUB);

      expect(ports.post).toHaveBeenCalledOnce();
    });

    it('WHEN the page sends ready twice THEN each ready posts the state', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'ready' });

      expect(ports.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a layout cache entry for the root', () => {
    it('WHEN its hash is the graph hash THEN the posted state carries the cached positions', async () => {
      const { session, ports } = shownSession(STATE_CACHE);

      await session.receive({ type: 'ready' });

      expect(lastStateOf(ports).positions).toStrictEqual(POSITIONS_STUB);
    });

    it('WHEN its hash is older (a package was added) THEN the posted positions are null', async () => {
      const { session, ports } = shownSession(OLD_CACHE);

      await session.receive({ type: 'ready' });

      expect(lastStateOf(ports).positions).toBeNull();
    });
  });

  describe('GIVEN a shown session whose page is ready', () => {
    describe('WHEN the panel is hidden', () => {
      it('THEN a model change posts nothing', async () => {
        const { session, store, ports } = shownSession();

        await session.receive({ type: 'ready' });
        session.setVisible(false);

        store.apply('/ws', GROWN_LOADED_STUB);

        expect(ports.post).toHaveBeenCalledOnce();
      });

      it('THEN showing it posts nothing until the page is ready again, then one state', async () => {
        const { session, ports } = shownSession();

        await session.receive({ type: 'ready' });
        session.setVisible(false);
        vi.mocked(ports.post).mockClear();

        session.setVisible(true);
        const postedOnShow = vi.mocked(ports.post).mock.calls.length;

        await session.receive({ type: 'ready' });

        expect(postedOnShow).toBe(0);
        expect(ports.post).toHaveBeenCalledOnce();
      });
    });

    it('WHEN the page is ready while hidden and the panel is then shown THEN one state is posted', async () => {
      const { session, ports } = shownSession();

      session.setVisible(false);
      await session.receive({ type: 'ready' });

      session.setVisible(true);

      expect(ports.post).toHaveBeenCalledOnce();
    });

    it('WHEN another root changes THEN nothing is posted', async () => {
      const store = loadedStore();

      store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], () => coordinatorMock());
      const { session, ports } = shownSession(null, store);

      await session.receive({ type: 'ready' });

      store.apply('/other', GROWN_LOADED_STUB);

      expect(ports.post).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a shown session on a root with no model', () => {
    it('WHEN a binary failure arrives THEN the error text is posted, and a later model posts the graph', async () => {
      const { session, store, ports } = shownSession(null, emptyStore());

      await session.receive({ type: 'ready' });

      store.apply('/ws', LOAD_FAILURE_STUB);
      store.apply('/ws', GRAPH_LOADED_STUB);

      const states = postedStatesOf(ports);

      expect(states).toStrictEqual([
        { kind: 'loading' },
        { kind: 'error', message: MESSAGE_TEXTS['binary-not-found'] },
        GRAPH_STATE_STUB
      ]);
    });
  });

  describe('GIVEN the panel visibility', () => {
    it('WHEN it is shown twice THEN the panel is reported shown once', () => {
      const { session, ports } = shownSession();

      session.setVisible(true);

      expect(ports.setPanelVisible).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('WHEN it is disposed while shown THEN the panel is reported hidden once, even on a second dispose', () => {
      const { session, ports } = shownSession();

      session.dispose();
      session.dispose();

      expect(ports.setPanelVisible).toHaveBeenLastCalledWith(false);
      expect(ports.setPanelVisible).toHaveBeenCalledTimes(2);
    });

    it('WHEN it is disposed while hidden THEN the panel is not reported', () => {
      const { session, ports } = shownSession();

      session.setVisible(false);
      vi.mocked(ports.setPanelVisible).mockClear();

      session.dispose();

      expect(ports.setPanelVisible).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a disposed session', () => {
    it('WHEN the model changes THEN nothing is posted', async () => {
      const { session, store, ports } = shownSession();

      await session.receive({ type: 'ready' });
      session.dispose();

      store.apply('/ws', GROWN_LOADED_STUB);

      expect(ports.post).toHaveBeenCalledOnce();
    });

    it('WHEN a message arrives THEN nothing happens, not even a log', async () => {
      const { session, ports } = shownSession();

      session.dispose();

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'nope' });

      expect(ports.post).not.toHaveBeenCalled();
      expect(ports.log).not.toHaveBeenCalled();
    });

    it('WHEN it is started or shown THEN it neither subscribes nor reports', () => {
      const store = loadedStore();
      const { ports } = shownSession(null, store);
      const session = new GraphSession('/ws', store, ports);

      session.dispose();
      vi.mocked(ports.setPanelVisible).mockClear();

      session.start();
      session.setVisible(true);

      expect(ports.setPanelVisible).not.toHaveBeenCalled();
    });
  });
});
