import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphFeeds, GraphPorts } from '../common/graph.type.ts';
import type { ToggleFakes } from '../test/common/graph.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { feedsOf, predictionFake, togglesOf } from '../test/utils/graph-feeds.spec.util.ts';
import { postedRunsMessagesOf } from '../test/utils/graph-session-runs.spec.util.ts';
import { portsWith } from '../test/utils/graph-session.spec.util.ts';
import { predictionViewOf } from '../test/utils/prediction-view.spec.util.ts';

type PredictionSession = {
  readonly session: GraphSession;
  readonly ports: GraphPorts;
  readonly toggles: ToggleFakes;
};

const HIT_A = predictionViewOf({ a: [['a#build', 'HIT']] });

const predictionSession = (): PredictionSession => {
  const toggles = togglesOf();
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);
  void toggles.prediction.set(true);

  const fake = predictionFake(HIT_A);
  const base = feedsOf(new RunStore(), undefined, toggles);
  const feeds: GraphFeeds = { ...base, prediction: fake.prediction };
  const ports = portsWith(null);
  const session = new GraphSession('/ws', store, ports, feeds);

  session.setVisible(true);
  session.start();

  const built: PredictionSession = { session, ports, toggles };

  return built;
};

describe('FEATURE: graph session prediction', () => {
  it('GIVEN the prediction toggle on and an answer WHEN the page is ready THEN the first runs message carries it', async () => {
    const { session, ports } = predictionSession();

    await session.receive({ type: 'ready' });

    expect(postedRunsMessagesOf(ports).at(0)?.predictions).toStrictEqual({ 'a#build': 'cached' });
  });

  it('GIVEN predictions on the page WHEN the toggle turns off THEN the next posted runs message has no predictions, in one message', async () => {
    const { session, ports, toggles } = predictionSession();

    await session.receive({ type: 'ready' });
    await toggles.prediction.set(false);

    const runs = postedRunsMessagesOf(ports);

    expect('predictions' in (runs.at(-1) ?? {})).toBe(false);
    expect(runs.filter((message) => 'predictions' in message)).toHaveLength(1);
  });
});
