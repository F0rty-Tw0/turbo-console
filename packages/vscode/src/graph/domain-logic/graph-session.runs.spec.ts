import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { A_BUILD_DEFINITION_STUB, RUN_A_BUILD_STUB } from '../test/stubs/graph-run.stub.ts';
import { postedRunsOf, postedTypesOf } from '../test/utils/graph-session-runs.spec.util.ts';
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
const shownSession = (store: RootStore = loadedStore(), runs: RunStore = new RunStore()): ShownSession => {
  const ports = portsWith(null);
  const session = new GraphSession('/ws', store, ports, runs);

  session.setVisible(true);
  session.start();

  const shown: ShownSession = { session, runs, ports };

  return shown;
};

/** A ready session hidden while a#build starts and ends, then revealed and ready again. */
const revealedSession = async (): Promise<ShownSession> => {
  const shown = shownSession();
  const { session, runs } = shown;

  await session.receive({ type: 'ready' });
  session.setVisible(false);
  runs.tryStart(RUN_A_BUILD_STUB, 1000);
  runs.processEnded(A_BUILD_DEFINITION_STUB, 0, 2000);
  session.setVisible(true);
  await session.receive({ type: 'ready' });
  vi.advanceTimersByTime(200);

  return shown;
};

describe('FEATURE: graph session runs feed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a shown, ready session on /ws', () => {
    describe('WHEN a#build starts', () => {
      it('THEN nothing is posted at 49 ms', async () => {
        const { session, runs, ports } = shownSession();

        await session.receive({ type: 'ready' });
        runs.tryStart(RUN_A_BUILD_STUB, 1000);
        vi.advanceTimersByTime(49);

        expect(postedRunsOf(ports)).toStrictEqual([{}]);
      });

      it('THEN exactly one runs message follows at 50 ms', async () => {
        const { session, runs, ports } = shownSession();

        await session.receive({ type: 'ready' });
        runs.tryStart(RUN_A_BUILD_STUB, 1000);
        vi.advanceTimersByTime(50);

        expect(postedRunsOf(ports)).toStrictEqual([{}, { 'a#build': 'running' }]);
      });
    });

    it('WHEN a#build starts and ends inside one 50 ms window THEN one post carries passed', async () => {
      const { session, runs, ports } = shownSession();

      await session.receive({ type: 'ready' });
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      runs.processEnded(A_BUILD_DEFINITION_STUB, 0, 2000);
      vi.advanceTimersByTime(100);

      expect(postedRunsOf(ports)).toStrictEqual([{}, { 'a#build': 'passed' }]);
    });

    it('WHEN a second change lands 60 ms after the first post THEN a second post follows', async () => {
      const { session, runs, ports } = shownSession();

      await session.receive({ type: 'ready' });
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(50);
      vi.advanceTimersByTime(60);
      runs.processEnded(A_BUILD_DEFINITION_STUB, 0, 2000);
      vi.advanceTimersByTime(50);

      expect(postedRunsOf(ports)).toStrictEqual([{}, { 'a#build': 'running' }, { 'a#build': 'passed' }]);
    });

    describe('WHEN the panel is hidden and a#build starts and ends', () => {
      it('THEN no timer is armed', async () => {
        const { session, runs } = shownSession();

        await session.receive({ type: 'ready' });
        session.setVisible(false);
        runs.tryStart(RUN_A_BUILD_STUB, 1000);
        runs.processEnded(A_BUILD_DEFINITION_STUB, 0, 2000);

        expect(vi.getTimerCount()).toBe(0);
      });

      it('THEN no runs message is posted for 200 ms', async () => {
        const { session, runs, ports } = shownSession();

        await session.receive({ type: 'ready' });
        session.setVisible(false);
        runs.tryStart(RUN_A_BUILD_STUB, 1000);
        runs.processEnded(A_BUILD_DEFINITION_STUB, 0, 2000);
        vi.advanceTimersByTime(200);

        expect(postedRunsOf(ports)).toStrictEqual([{}]);
      });

      it('THEN the reveal and ready each post the state, then a map', async () => {
        const { ports } = await revealedSession();

        expect(postedTypesOf(ports)).toStrictEqual(['state', 'runs', 'state', 'runs']);
      });

      it('THEN the last map carries the final result', async () => {
        const { ports } = await revealedSession();

        expect(postedRunsOf(ports).at(-1)).toStrictEqual({ 'a#build': 'passed' });
      });
    });

    it('WHEN the panel is hidden before the timer fires THEN nothing is posted', async () => {
      const { session, runs, ports } = shownSession();

      await session.receive({ type: 'ready' });
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      session.setVisible(false);
      vi.advanceTimersByTime(100);

      expect(postedRunsOf(ports)).toStrictEqual([{}]);
    });

    describe('WHEN a#build starts under /other', () => {
      it('THEN no runs message is posted for 100 ms', async () => {
        const { session, runs, ports } = shownSession();

        await session.receive({ type: 'ready' });
        runs.tryStart({ ...RUN_A_BUILD_STUB, root: '/other' }, 1000);
        vi.advanceTimersByTime(100);

        expect(postedRunsOf(ports)).toStrictEqual([{}]);
      });

      it('THEN a later /ws run posts the /ws entry only', async () => {
        const { session, runs, ports } = shownSession();

        await session.receive({ type: 'ready' });
        runs.tryStart({ ...RUN_A_BUILD_STUB, root: '/other' }, 1000);
        runs.processEnded({ root: '/other', id: 'a#build' }, 0, 2000);
        runs.tryStart(RUN_A_BUILD_STUB, 3000);
        vi.advanceTimersByTime(100);

        expect(postedRunsOf(ports)).toStrictEqual([{}, { 'a#build': 'running' }]);
      });
    });

    it('WHEN a run of an unlisted task starts THEN the next runs map has no key for it', async () => {
      const { session, runs, ports } = shownSession();
      const goneTask = { ...RUN_A_BUILD_STUB.task, id: 'gone#build' };
      const gone = { ...RUN_A_BUILD_STUB, packageName: 'gone', task: goneTask };

      await session.receive({ type: 'ready' });
      runs.tryStart(gone, 1000);
      vi.advanceTimersByTime(50);

      expect(postedRunsOf(ports)).toStrictEqual([{}, {}]);
    });

    it('WHEN ready arrives twice THEN each state is followed by its map', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'ready' });

      expect(postedTypesOf(ports)).toStrictEqual(['state', 'runs', 'state', 'runs']);
    });

    describe('WHEN the session is disposed with a timer armed', () => {
      it('THEN advancing 100 ms posts nothing', async () => {
        const { session, runs, ports } = shownSession();

        await session.receive({ type: 'ready' });
        runs.tryStart(RUN_A_BUILD_STUB, 1000);
        session.dispose();
        const postedBefore = postedOf(ports).length;

        vi.advanceTimersByTime(100);

        expect(postedOf(ports)).toHaveLength(postedBefore);
      });

      it('THEN no timer is left', async () => {
        const { session, runs } = shownSession();

        await session.receive({ type: 'ready' });
        runs.tryStart(RUN_A_BUILD_STUB, 1000);
        session.dispose();

        expect(vi.getTimerCount()).toBe(0);
      });

      it('THEN a later run change posts nothing', async () => {
        const { session, runs, ports } = shownSession();

        await session.receive({ type: 'ready' });
        session.dispose();
        runs.tryStart(RUN_A_BUILD_STUB, 1000);
        vi.advanceTimersByTime(100);

        expect(postedRunsOf(ports)).toStrictEqual([{}]);
      });

      it('THEN the runs listener is unsubscribed', () => {
        const runs = new RunStore();
        const off = vi.fn();

        vi.spyOn(runs, 'onDidChange').mockReturnValue(off);

        const { session } = shownSession(loadedStore(), runs);

        session.dispose();

        expect(off).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a shown session on a root that is not loaded', () => {
    it('WHEN the page is ready THEN the state is followed by an empty map', async () => {
      const { session, ports } = shownSession(new RootStore());

      await session.receive({ type: 'ready' });

      expect(postedRunsOf(ports)).toStrictEqual([{}]);
    });
  });
});
