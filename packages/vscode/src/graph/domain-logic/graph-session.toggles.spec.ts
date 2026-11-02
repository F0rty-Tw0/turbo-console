import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphFeeds, GraphPorts } from '../common/graph.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { feedsOf } from '../test/utils/graph-feeds.spec.util.ts';
import { portsWith, postedStatesOf } from '../test/utils/graph-session.spec.util.ts';

type ShownSession = {
  readonly session: GraphSession;
  readonly ports: GraphPorts;
  readonly toggles: GraphFeeds['toggles'];
};

const shownSession = (): ShownSession => {
  const toggles = { scope: scriptsToggleMock(true), scripts: scriptsToggleMock() };
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);

  const ports = portsWith(null);
  const session = new GraphSession('/ws', store, ports, feedsOf(new RunStore(), undefined, toggles));

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
});
