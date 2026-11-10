import type { WorkspaceModel } from '@turbo-console/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphListing } from '../common/graph-atom.type.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphFeeds, GraphPorts } from '../common/graph.type.ts';
import type { PredictionFake, ToggleFakes } from '../test/common/graph.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { feedsOf, predictionFake, togglesOf } from '../test/utils/graph-feeds.spec.util.ts';
import { postedRunsMessagesOf } from '../test/utils/graph-session-runs.spec.util.ts';
import { portsWith } from '../test/utils/graph-session.spec.util.ts';
import { predictionViewOf } from '../test/utils/prediction-view.spec.util.ts';
import type * as graphTasks from '../utils/graph-tasks.util.ts';

const listingSpy = vi.hoisted(() => vi.fn<(model: WorkspaceModel) => GraphListing>());

vi.mock('../utils/graph-tasks.util.ts', async (original) => {
  const actual = await original<typeof graphTasks>();
  const mocked = { ...actual, graphListingOf: listingSpy };

  listingSpy.mockImplementation(actual.graphListingOf);

  return mocked;
});

type PredictionSession = {
  readonly session: GraphSession;
  readonly ports: GraphPorts;
  readonly toggles: ToggleFakes;
  readonly fake: PredictionFake;
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

  const built: PredictionSession = { session, ports, toggles, fake };

  return built;
};

describe('FEATURE: graph session prediction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('GIVEN the toggle on and a ready page WHEN two prediction changes post twice THEN the task listing is not built again', async () => {
    vi.useFakeTimers();

    const { session, fake } = predictionSession();

    await session.receive({ type: 'ready' });
    listingSpy.mockClear();
    fake.changed('/ws');
    vi.advanceTimersByTime(RUNS_COALESCE_MS);
    fake.changed('/ws');
    vi.advanceTimersByTime(RUNS_COALESCE_MS);

    expect(listingSpy).not.toHaveBeenCalled();
  });

  it('GIVEN the prediction toggle on and an answer WHEN the page is ready THEN the first runs message carries it', async () => {
    const { session, ports } = predictionSession();

    await session.receive({ type: 'ready' });

    expect(postedRunsMessagesOf(ports).at(0)?.predictions).toStrictEqual({ 'a#build': 'cached' });
  });

  it('GIVEN predictions on the page WHEN the toggle turns off THEN one more runs message follows, carrying {}', async () => {
    const { session, ports, toggles } = predictionSession();

    await session.receive({ type: 'ready' });
    await toggles.prediction.set(false);

    const runs = postedRunsMessagesOf(ports);
    const predictions = runs.map((message) => message.predictions);

    expect(predictions).toStrictEqual([{ 'a#build': 'cached' }, {}]);
  });
});
