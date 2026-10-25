import type { GraphState } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphAtomFeed } from './graph-atom-feed.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphPorts, TaskFeedGate } from '../common/graph.type.ts';
import type { AtomsFake } from '../test/common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_ATOM_LOOKUP_STUB, GRAPH_ATOM_MODEL_STUB } from '../test/stubs/graph-atom-model.stub.ts';
import { GRAPH_STATE_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';
import { atomsFake } from '../test/utils/graph-feeds.spec.util.ts';
import { postedAtomsOf } from '../test/utils/graph-session-runs.spec.util.ts';
import { graphStateOf } from '../utils/graph-state.util.ts';

const ATOM_STATE = graphStateOf(GRAPH_ATOM_MODEL_STUB, NO_LAYOUT_CACHES_STUB);

type FeedFixture = {
  readonly feed: GraphAtomFeed;
  readonly fake: AtomsFake;
  readonly ports: GraphPorts;
  readonly canPost: Mock<TaskFeedGate['canPost']>;
};

/** A feed on `/ws` over fake atoms and spy ports; its gate is open and shows the atom state. */
const feedAt = (state: GraphState): FeedFixture => {
  const fake = atomsFake(GRAPH_ATOM_LOOKUP_STUB);
  const ports = graphPortsMock();
  const canPost = vi.fn<TaskFeedGate['canPost']>().mockReturnValue(true);
  const gate: Pick<TaskFeedGate, 'canPost' | 'state'> = { canPost, state: () => state };
  const feed = new GraphAtomFeed({ root: '/ws', atoms: fake.atoms, ports, gate });
  const fixture: FeedFixture = { feed, fake, ports, canPost };

  return fixture;
};

describe('FEATURE: graph atom feed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a started feed on a state with an atom group', () => {
    it('WHEN three changes of the root land within RUNS_COALESCE_MS THEN one atoms message is posted', () => {
      const { feed, fake, ports } = feedAt(ATOM_STATE);

      feed.start();
      fake.changed('/ws', '@fx/e2e');
      fake.changed('/ws', '@fx/e2e');
      fake.changed('/ws', '@fx/e2e');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedAtomsOf(ports)).toHaveLength(1);
    });

    it('WHEN a change lands THEN nothing is posted before RUNS_COALESCE_MS', () => {
      const { feed, fake, ports } = feedAt(ATOM_STATE);

      feed.start();
      fake.changed('/ws', '@fx/e2e');
      vi.advanceTimersByTime(RUNS_COALESCE_MS - 1);

      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });

    it('WHEN a change of another root lands THEN nothing is posted', () => {
      const { feed, fake, ports } = feedAt(ATOM_STATE);

      feed.start();
      fake.changed('/other', '@fx/e2e');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });

    it('WHEN the page cannot take posts THEN a change posts nothing and arms no timer', () => {
      const { feed, fake, ports, canPost } = feedAt(ATOM_STATE);

      canPost.mockReturnValue(false);
      feed.start();
      fake.changed('/ws', '@fx/e2e');

      expect(vi.getTimerCount()).toBe(0);
      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });

    it('WHEN the gate closes before the timer fires THEN nothing is posted', () => {
      const { feed, fake, ports, canPost } = feedAt(ATOM_STATE);

      feed.start();
      fake.changed('/ws', '@fx/e2e');
      canPost.mockReturnValue(false);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });

    it('WHEN it is flushed THEN the message is posted at once and the pending timer is cancelled', () => {
      const { feed, fake, ports } = feedAt(ATOM_STATE);

      feed.start();
      fake.changed('/ws', '@fx/e2e');
      feed.flush(ATOM_STATE);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedAtomsOf(ports)).toHaveLength(1);
    });

    it('WHEN it is started twice THEN it subscribes once', () => {
      const { feed, fake } = feedAt(ATOM_STATE);

      feed.start();
      feed.start();

      expect(fake.listenerCount()).toBe(1);
    });

    it('WHEN it is stopped THEN it unsubscribes and a pending timer posts nothing', () => {
      const { feed, fake, ports } = feedAt(ATOM_STATE);

      feed.start();
      fake.changed('/ws', '@fx/e2e');
      feed.stop();
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(fake.listenerCount()).toBe(0);
      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });
  });

  describe('GIVEN a state without atom groups', () => {
    it('WHEN it is flushed THEN nothing is posted', () => {
      const { feed, ports } = feedAt(GRAPH_STATE_STUB);

      feed.flush(GRAPH_STATE_STUB);

      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });

    it('WHEN a change lands THEN nothing is posted', () => {
      const { feed, fake, ports } = feedAt(GRAPH_STATE_STUB);

      feed.start();
      fake.changed('/ws', '@fx/e2e');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedAtomsOf(ports)).toStrictEqual([]);
    });
  });
});
