import type { GraphRunsMessage, GraphState } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskFeed } from './graph-task-feed.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphFeeds, GraphPorts, TaskFeedGate } from '../common/graph.type.ts';
import type { AffectedFake, ToggleFakes } from '../test/common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import {
  AFFECTED_MARKS_STUB,
  AFFECTED_VIEW_STUB,
  OTHER_AFFECTED_MARKS_STUB,
  OTHER_AFFECTED_VIEW_STUB
} from '../test/stubs/graph-affected.stub.ts';
import { GRAPH_STATE_STUB, GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { affectedFake, feedsOf, togglesOf } from '../test/utils/graph-feeds.spec.util.ts';
import { postedRunsMessagesOf } from '../test/utils/graph-session-runs.spec.util.ts';

type AffectedFeedFixture = {
  readonly feed: GraphTaskFeed;
  readonly ports: GraphPorts;
  readonly fake: AffectedFake;
  readonly toggles: ToggleFakes;
};

const LISTED_IDS = GRAPH_TASKS_STUB.map((task) => task.id);
const NOT_A_GRAPH_STATE_STUB: GraphState = { kind: 'loading' };

/** A feed on `/ws` over an open gate listing `GRAPH_TASKS_STUB`, with the affected toggle on and `AFFECTED_VIEW_STUB` in the store. */
const fixtureOf = (): AffectedFeedFixture => {
  const fake = affectedFake(AFFECTED_VIEW_STUB);
  const toggles = togglesOf();
  const ports = graphPortsMock();
  const gate: TaskFeedGate = {
    canPost: () => true,
    state: () => GRAPH_STATE_STUB,
    runIds: () => LISTED_IDS,
    persistentIds: () => new Set(),
    tasks: () => GRAPH_TASKS_STUB
  };

  toggles.affected.isShown.mockReturnValue(true);

  const base = feedsOf(new RunStore(), undefined, toggles);
  const feeds: GraphFeeds = { ...base, affected: fake.affected };
  const feed = new GraphTaskFeed({ root: '/ws', ports, gate, feeds });
  const fixture: AffectedFeedFixture = { feed, ports, fake, toggles };

  return fixture;
};

const lastRunsOf = (ports: GraphPorts): GraphRunsMessage | undefined => postedRunsMessagesOf(ports).at(-1);

describe('FEATURE: affected marks in the graph feed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN the toggle on and a view', () => {
    it('WHEN the state is flushed THEN the runs message carries the marks', () => {
      const { feed, ports } = fixtureOf();

      feed.flush(GRAPH_STATE_STUB);

      expect(lastRunsOf(ports)?.affected).toStrictEqual(AFFECTED_MARKS_STUB);
    });

    it('WHEN the store reports a changed view of this root THEN one runs message with the new marks follows the coalesce window', () => {
      const { feed, ports, fake } = fixtureOf();

      feed.start();
      feed.flush(GRAPH_STATE_STUB);
      fake.setView(OTHER_AFFECTED_VIEW_STUB);
      fake.changed('/ws');
      fake.changed('/ws');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedRunsMessagesOf(ports)).toHaveLength(2);
      expect(lastRunsOf(ports)?.affected).toStrictEqual(OTHER_AFFECTED_MARKS_STUB);
    });

    it('WHEN the store reports a change but the view is unchanged THEN nothing more is posted', () => {
      const { feed, ports, fake } = fixtureOf();

      feed.start();
      feed.flush(GRAPH_STATE_STUB);
      fake.changed('/ws');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedRunsMessagesOf(ports)).toHaveLength(1);
    });

    it('WHEN the store reports a change of another root THEN nothing is posted', () => {
      const { feed, ports, fake } = fixtureOf();

      feed.start();
      feed.flush(GRAPH_STATE_STUB);
      fake.setView(OTHER_AFFECTED_VIEW_STUB);
      fake.changed('/other');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedRunsMessagesOf(ports)).toHaveLength(1);
    });

    it('WHEN an unchanged report sits between two forced flushes THEN its repeat post is skipped and both forced posts carry affected', () => {
      const { feed, ports, fake } = fixtureOf();

      feed.start();
      feed.flush(GRAPH_STATE_STUB);
      fake.changed('/ws');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);
      feed.flush(GRAPH_STATE_STUB);

      const runs = postedRunsMessagesOf(ports);

      expect(runs.map((message) => 'affected' in message)).toStrictEqual([true, true]);
    });
  });

  describe('GIVEN the toggle on and no view', () => {
    it('WHEN the state is flushed THEN affected is null, with the key present', () => {
      const { feed, ports, fake } = fixtureOf();

      fake.setView(null);
      feed.flush(GRAPH_STATE_STUB);

      expect(lastRunsOf(ports)).toHaveProperty('affected', null);
    });
  });

  describe('GIVEN the toggle off', () => {
    it('WHEN the state is flushed THEN the forced post carries null and the store is not read', () => {
      const { feed, ports, fake, toggles } = fixtureOf();
      const view = vi.spyOn(fake.affected, 'view');

      toggles.affected.isShown.mockReturnValue(false);
      feed.flush(GRAPH_STATE_STUB);

      expect(lastRunsOf(ports)).toHaveProperty('affected', null);
      expect(view).not.toHaveBeenCalled();
    });

    it('WHEN nothing was flushed and the store changes THEN the first coalesced post carries affected null', () => {
      const { feed, ports, fake, toggles } = fixtureOf();

      toggles.affected.isShown.mockReturnValue(false);
      feed.start();
      fake.changed('/ws');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedRunsMessagesOf(ports)).toHaveLength(1);
      expect(lastRunsOf(ports)).toHaveProperty('affected', null);
    });
  });

  describe('GIVEN a started feed', () => {
    it('WHEN the feed stops THEN its store listener is removed', () => {
      const { feed, fake } = fixtureOf();

      feed.start();
      feed.stop();

      expect(fake.listenerCount()).toBe(0);
    });
  });

  describe.each([
    ['a graph state with affectedShown true', { ...GRAPH_STATE_STUB, affectedShown: true }, ['/ws']],
    ['a graph state with affectedShown false', { ...GRAPH_STATE_STUB, affectedShown: false }, []],
    ['a state that is not a graph', NOT_A_GRAPH_STATE_STUB, []]
  ])('GIVEN %s', (_label, state, roots) => {
    it(`WHEN it is flushed THEN rootShown runs for ${roots.length} root(s)`, () => {
      const { feed, fake } = fixtureOf();

      feed.flush(state);

      expect(fake.rootShown.mock.calls.map(([root]) => root)).toStrictEqual(roots);
    });
  });
});
