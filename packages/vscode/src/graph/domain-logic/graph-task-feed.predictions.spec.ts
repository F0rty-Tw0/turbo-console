import type { GraphRunsMessage } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskFeed } from './graph-task-feed.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import type { PredictionLookup } from '../../tree/common/prediction.type.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphFeeds, GraphPorts, TaskFeedGate } from '../common/graph.type.ts';
import type { PredictionFake } from '../test/common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB, GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { feedsOf, predictionFake, togglesOf } from '../test/utils/graph-feeds.spec.util.ts';
import { postedRunsMessagesOf } from '../test/utils/graph-session-runs.spec.util.ts';
import { predictionViewOf } from '../test/utils/prediction-view.spec.util.ts';

type AnswersBox = { current: PredictionLookup };

type PredictionFeedFixture = {
  readonly feed: GraphTaskFeed;
  readonly ports: GraphPorts;
  readonly fake: PredictionFake;
  readonly answers: AnswersBox;
};

const HIT_A = predictionViewOf({ a: [['a#build', 'HIT']] });
const MISS_A = predictionViewOf({ a: [['a#build', 'MISS']] });
const LISTED_IDS = GRAPH_TASKS_STUB.map((task) => task.id);

/** A feed on `/ws` over an open gate listing `GRAPH_TASKS_STUB`, whose prediction view reads `answers.current`. */
const feedWith = (isShown: boolean, view: PredictionLookup): PredictionFeedFixture => {
  const answers = { current: view };
  const fake = predictionFake((root, packageName) => answers.current(root, packageName));
  const toggles = togglesOf();
  const ports = graphPortsMock();
  const gate: TaskFeedGate = {
    canPost: () => true,
    state: () => GRAPH_STATE_STUB,
    runIds: () => LISTED_IDS,
    persistentIds: () => new Set(),
    tasks: () => GRAPH_TASKS_STUB
  };

  toggles.prediction.isShown.mockReturnValue(isShown);

  const base = feedsOf(new RunStore(), undefined, toggles);
  const feeds: GraphFeeds = { ...base, prediction: fake.prediction };
  const feed = new GraphTaskFeed({ root: '/ws', ports, gate, feeds });
  const fixture: PredictionFeedFixture = { feed, ports, fake, answers };

  return fixture;
};

const lastRunsOf = (ports: GraphPorts): GraphRunsMessage | undefined => postedRunsMessagesOf(ports).at(-1);

describe('FEATURE: cache prediction in the graph feed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('GIVEN the toggle on and an answer WHEN the state is flushed THEN the runs message carries predictions', () => {
    const { feed, ports } = feedWith(true, HIT_A);

    feed.flush(GRAPH_STATE_STUB);

    expect(lastRunsOf(ports)?.predictions).toStrictEqual({ 'a#build': 'cached' });
  });

  it('GIVEN the toggle on and no answer WHEN the state is flushed THEN predictions is {}', () => {
    const { feed, ports } = feedWith(true, () => null);

    feed.flush(GRAPH_STATE_STUB);

    expect(lastRunsOf(ports)?.predictions).toStrictEqual({});
  });

  it('GIVEN the toggle off and an answer WHEN the state is flushed THEN the runs message has no predictions key', () => {
    const { feed, ports } = feedWith(false, HIT_A);

    feed.flush(GRAPH_STATE_STUB);

    expect('predictions' in (lastRunsOf(ports) ?? {})).toBe(false);
  });

  it('WHEN the store reports a change of this root THEN one runs message with the new predictions follows the coalesce window', () => {
    const { feed, ports, fake, answers } = feedWith(true, HIT_A);

    feed.start();
    feed.flush(GRAPH_STATE_STUB);
    answers.current = MISS_A;
    fake.changed('/ws');
    vi.advanceTimersByTime(RUNS_COALESCE_MS);

    expect(lastRunsOf(ports)?.predictions).toStrictEqual({ 'a#build': 'notCached' });
    expect(postedRunsMessagesOf(ports)).toHaveLength(2);
  });

  it('WHEN the store reports a change of another root THEN nothing more is posted', () => {
    const { feed, ports, fake, answers } = feedWith(true, HIT_A);

    feed.start();
    feed.flush(GRAPH_STATE_STUB);
    answers.current = MISS_A;
    fake.changed('/other');
    vi.advanceTimersByTime(RUNS_COALESCE_MS);

    expect(postedRunsMessagesOf(ports)).toHaveLength(1);
  });

  it('WHEN the feed stops THEN its store listener is removed', () => {
    const { feed, fake } = feedWith(true, HIT_A);

    feed.start();
    feed.stop();

    expect(fake.listenerCount()).toBe(0);
  });

  it('WHEN the feed starts THEN it holds one store listener', () => {
    const { feed, fake } = feedWith(true, HIT_A);

    feed.start();

    expect(fake.listenerCount()).toBe(1);
  });
});
