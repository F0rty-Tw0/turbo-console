import type { GraphRunsMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphFeeds, GraphPorts } from '../common/graph.type.ts';
import type { AffectedFake, ToggleFakes } from '../test/common/graph.type.ts';
import { AFFECTED_MARKS_STUB, AFFECTED_VIEW_STUB } from '../test/stubs/graph-affected.stub.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { affectedFake, feedsOf, togglesOf } from '../test/utils/graph-feeds.spec.util.ts';
import { postedRunsMessagesOf } from '../test/utils/graph-session-runs.spec.util.ts';
import { portsWith, postedStatesOf } from '../test/utils/graph-session.spec.util.ts';

type AffectedSession = {
  readonly session: GraphSession;
  readonly ports: GraphPorts;
  readonly toggles: ToggleFakes;
  readonly fake: AffectedFake;
};

const affectedSession = (): AffectedSession => {
  const toggles = togglesOf();
  const fake = affectedFake(AFFECTED_VIEW_STUB);
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);

  const ports = portsWith(null);
  const base = feedsOf(new RunStore(), undefined, toggles);
  const feeds: GraphFeeds = { ...base, affected: fake.affected };
  const session = new GraphSession('/ws', store, ports, feeds);

  session.setVisible(true);
  session.start();

  const shown: AffectedSession = { session, ports, toggles, fake };

  return shown;
};

const isMarked = (message: GraphRunsMessage): boolean => message.affected !== null && message.affected !== undefined;

describe('FEATURE: graph session affected marks', () => {
  describe('GIVEN the affected toggle on', () => {
    describe('WHEN the page is ready', () => {
      let shown: AffectedSession;

      beforeEach(async () => {
        shown = affectedSession();
        shown.toggles.affected.isShown.mockReturnValue(true);
        await shown.session.receive({ type: 'ready' });
      });

      it('THEN the state has affectedShown true', () => {
        expect(postedStatesOf(shown.ports).at(-1)).toMatchObject({ affectedShown: true });
      });

      it('THEN rootShown ran once for the root', () => {
        expect(shown.fake.rootShown).toHaveBeenCalledExactlyOnceWith('/ws');
      });

      it('THEN the first runs message carries the marks', () => {
        expect(postedRunsMessagesOf(shown.ports).at(-1)?.affected).toStrictEqual(AFFECTED_MARKS_STUB);
      });
    });
  });

  describe('GIVEN marks on the page', () => {
    describe('WHEN the toggle turns off', () => {
      let runs: GraphRunsMessage[];

      beforeEach(async () => {
        const { session, ports, toggles } = affectedSession();

        await toggles.affected.set(true);
        await session.receive({ type: 'ready' });
        await toggles.affected.set(false);
        runs = postedRunsMessagesOf(ports);
      });

      it('THEN the next runs message has affected null', () => {
        expect(runs.at(-1)).toHaveProperty('affected', null);
      });

      it('THEN only the first runs message carried marks', () => {
        expect(runs.filter(isMarked)).toHaveLength(1);
      });
    });
  });
});
