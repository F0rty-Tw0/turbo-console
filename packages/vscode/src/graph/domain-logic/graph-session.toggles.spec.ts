import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import type { ToggleFakes } from '../test/common/graph.type.ts';
import { GRAPH_HASH_STUB, GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { feedsWithToggles, togglesOf } from '../test/utils/graph-feeds.spec.util.ts';
import { portsWith, postedStatesOf } from '../test/utils/graph-session.spec.util.ts';

type ShownSession = {
  readonly session: GraphSession;
  readonly ports: GraphPorts;
  readonly toggles: ToggleFakes;
};

const shownSession = (isScopeShown = true): ShownSession => {
  const toggles = togglesOf(isScopeShown);
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);

  const ports = portsWith(null);
  const session = new GraphSession('/ws', store, ports, feedsWithToggles(new RunStore(), toggles));

  session.setVisible(true);
  session.start();

  const shown: ShownSession = { session, ports, toggles };

  return shown;
};

describe('FEATURE: graph session toggles', () => {
  it('GIVEN scope shown and scripts hidden WHEN the page is ready THEN the posted state carries scopeShown true and scriptsShown false', async () => {
    const { session, ports } = shownSession();

    await session.receive({ type: 'ready' });

    expect(postedStatesOf(ports).at(-1)).toMatchObject({ kind: 'graph', scopeShown: true, scriptsShown: false });
  });

  it('GIVEN the scripts toggle turns on after the first ready WHEN the page is ready again THEN the state carries scriptsShown true', async () => {
    const { session, ports, toggles } = shownSession();

    await session.receive({ type: 'ready' });
    await toggles.scripts.set(true);
    await session.receive({ type: 'ready' });

    expect(postedStatesOf(ports).at(-1)).toMatchObject({ scriptsShown: true });
  });

  describe('GIVEN a ready, shown session with scope hidden', () => {
    it('WHEN the scope toggle turns on THEN one more state is posted', async () => {
      const { session, ports, toggles } = shownSession(false);

      await session.receive({ type: 'ready' });

      const before = postedStatesOf(ports).length;

      await toggles.scope.set(true);

      expect(postedStatesOf(ports)).toHaveLength(before + 1);
    });

    it('WHEN the scope toggle turns on THEN that state carries scopeShown true and the same hash', async () => {
      const { session, ports, toggles } = shownSession(false);

      await session.receive({ type: 'ready' });
      await toggles.scope.set(true);

      expect(postedStatesOf(ports).at(-1)).toMatchObject({ scopeShown: true, hash: GRAPH_HASH_STUB });
    });

    it('WHEN the scripts toggle turns on THEN one more state is posted with scriptsShown true', async () => {
      const { session, ports, toggles } = shownSession(false);

      await session.receive({ type: 'ready' });

      const before = postedStatesOf(ports).length;

      await toggles.scripts.set(true);

      expect(postedStatesOf(ports)).toHaveLength(before + 1);
      expect(postedStatesOf(ports).at(-1)).toMatchObject({ scriptsShown: true });
    });
  });

  describe('GIVEN a shown session whose page is ready', () => {
    it('WHEN the prediction toggle turns on THEN one more state is posted with predictionShown true', async () => {
      const { session, ports, toggles } = shownSession(false);

      await session.receive({ type: 'ready' });

      const before = postedStatesOf(ports).length;

      await toggles.prediction.set(true);

      expect(postedStatesOf(ports)).toHaveLength(before + 1);
      expect(postedStatesOf(ports).at(-1)).toMatchObject({ predictionShown: true });
    });
  });

  describe('GIVEN a shown session whose page is ready (affected)', () => {
    it('WHEN the affected toggle turns on THEN one more state is posted with affectedShown true', async () => {
      const { session, ports, toggles } = shownSession(false);

      await session.receive({ type: 'ready' });

      const before = postedStatesOf(ports).length;

      await toggles.affected.set(true);

      expect(postedStatesOf(ports)).toHaveLength(before + 1);
      expect(postedStatesOf(ports).at(-1)).toMatchObject({ affectedShown: true });
    });
  });

  describe('GIVEN a shown session before the page is ready', () => {
    it('WHEN a toggle changes THEN nothing is posted', async () => {
      const { ports, toggles } = shownSession();

      await toggles.scripts.set(true);

      expect(ports.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a ready session whose panel is then hidden', () => {
    it('WHEN a toggle changes THEN nothing is posted while hidden', async () => {
      const { session, ports, toggles } = shownSession();

      await session.receive({ type: 'ready' });
      session.setVisible(false);

      const before = postedStatesOf(ports).length;

      await toggles.scripts.set(true);

      expect(postedStatesOf(ports)).toHaveLength(before);
    });

    it('WHEN the panel is shown and ready again THEN the state carries the new value', async () => {
      const { session, ports, toggles } = shownSession();

      await session.receive({ type: 'ready' });
      session.setVisible(false);
      await toggles.scripts.set(true);
      session.setVisible(true);
      await session.receive({ type: 'ready' });

      expect(postedStatesOf(ports).at(-1)).toMatchObject({ scriptsShown: true });
    });
  });

  describe('GIVEN a started session', () => {
    it('WHEN it is disposed THEN both toggle subscriptions are undone', () => {
      const { session, toggles } = shownSession();

      session.dispose();

      expect([toggles.scope.listeners.size, toggles.scripts.listeners.size]).toStrictEqual([0, 0]);
    });
  });

  describe('GIVEN a ready session and a page setViewToggle scripts true', () => {
    it('WHEN the session receives it THEN the toggle is set', async () => {
      const { session, toggles } = shownSession();

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'setViewToggle', toggle: 'scripts', shown: true });

      expect(toggles.scripts.isShown()).toBe(true);
    });

    it('WHEN the session receives it THEN the last posted state carries scriptsShown true', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'setViewToggle', toggle: 'scripts', shown: true });

      expect(postedStatesOf(ports).at(-1)).toMatchObject({ scriptsShown: true });
    });
  });
});
