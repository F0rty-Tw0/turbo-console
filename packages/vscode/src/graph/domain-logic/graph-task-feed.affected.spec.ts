import type { GraphRunsMessage, GraphState } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

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

    describe('WHEN the store reports a changed view of this root twice within the coalesce window', () => {
      let ports: GraphPorts;

      beforeEach(() => {
        const fixture = fixtureOf();

        ports = fixture.ports;
        fixture.feed.start();
        fixture.feed.flush(GRAPH_STATE_STUB);
        fixture.fake.setView(OTHER_AFFECTED_VIEW_STUB);
        fixture.fake.changed('/ws');
        fixture.fake.changed('/ws');
        vi.advanceTimersByTime(RUNS_COALESCE_MS);
      });

      it('THEN one runs message follows the forced one', () => {
        expect(postedRunsMessagesOf(ports)).toHaveLength(2);
      });

      it('THEN it carries the new marks', () => {
        expect(lastRunsOf(ports)?.affected).toStrictEqual(OTHER_AFFECTED_MARKS_STUB);
      });
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
    describe('WHEN the state is flushed', () => {
      let ports: GraphPorts;
      let view: MockInstance<AffectedFake['affected']['view']>;

      beforeEach(() => {
        const fixture = fixtureOf();

        ports = fixture.ports;
        view = vi.spyOn(fixture.fake.affected, 'view');
        fixture.toggles.affected.isShown.mockReturnValue(false);
        fixture.feed.flush(GRAPH_STATE_STUB);
      });

      it('THEN the forced post carries affected null', () => {
        expect(lastRunsOf(ports)).toHaveProperty('affected', null);
      });

      it('THEN the store is not read', () => {
        expect(view).not.toHaveBeenCalled();
      });
    });

    describe('WHEN nothing was flushed and the store changes', () => {
      let ports: GraphPorts;

      beforeEach(() => {
        const fixture = fixtureOf();

        ports = fixture.ports;
        fixture.toggles.affected.isShown.mockReturnValue(false);
        fixture.feed.start();
        fixture.fake.changed('/ws');
        vi.advanceTimersByTime(RUNS_COALESCE_MS);
      });

      it('THEN one coalesced post goes out', () => {
        expect(postedRunsMessagesOf(ports)).toHaveLength(1);
      });

      it('THEN it carries affected null', () => {
        expect(lastRunsOf(ports)).toHaveProperty('affected', null);
      });
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
