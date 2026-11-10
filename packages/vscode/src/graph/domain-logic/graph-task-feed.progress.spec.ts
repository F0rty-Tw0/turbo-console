import type { GraphRunsMessage } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphTaskFeed } from './graph-task-feed.ts';
import type { ProgressOwner, ProgressRecord } from '../../run/common/run-progress.type.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { recordOf } from '../../run/test/utils/run-progress.spec.util.ts';
import type { GraphFeeds, GraphPorts, GraphProgress, TaskFeedGate } from '../common/graph.type.ts';
import type { ProgressFake } from '../test/common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB, GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { RUN_A_BUILD_STUB } from '../test/stubs/graph-run.stub.ts';
import { feedsOf, progressFake } from '../test/utils/graph-feeds.spec.util.ts';
import { postedRunsMessagesOf } from '../test/utils/graph-session-runs.spec.util.ts';

type ProgressFeedFixture = {
  readonly feed: GraphTaskFeed;
  readonly runs: RunStore;
  readonly ports: GraphPorts;
  readonly fake: ProgressFake;
  readonly canPost: Mock<TaskFeedGate['canPost']>;
  readonly runIds: Mock<TaskFeedGate['runIds']>;
};

const LISTED_IDS = GRAPH_TASKS_STUB.map((task) => task.id);
const LINT_OWNER: ProgressOwner = { root: '/ws', taskId: 'web#lint', launchedAt: 1100 };
const A_UNDER_WEB_BUILD = recordOf('a#build', 'running', 1100);
const A_UNDER_WEB_LINT = recordOf('a#build', 'running', 1200, LINT_OWNER);
const A_RUNNING: GraphRunsMessage['runs'] = { 'a#build': 'running' };
const A_UNDER_WEB_BUILD_OWNERS: GraphRunsMessage['owners'] = { 'a#build': 'web#build' };
const A_OWNED_BY_WEB_BUILD: GraphRunsMessage = { type: 'runs', runs: A_RUNNING, owners: A_UNDER_WEB_BUILD_OWNERS };

/** A `recordsOf` that gives `records` for `a#build` under `/ws` and nothing for any other id or root. */
const recordsOfA = (...records: ProgressRecord[]): GraphProgress['recordsOf'] => {
  const recordsOf = (root: string, taskId: string): ProgressRecord[] => {
    const isA = root === '/ws' && taskId === 'a#build';

    if (!isA) return [];

    return records;
  };

  return recordsOf;
};

/** A started feed on `/ws` with an open gate listing `GRAPH_TASKS_STUB`, whose progress holds `a#build` running under `web#build`. */
const startedFeed = (persistentIds: ReadonlySet<string> = new Set()): ProgressFeedFixture => {
  const runs = new RunStore();
  const ports = graphPortsMock();
  const fake = progressFake();
  const canPost = vi.fn<TaskFeedGate['canPost']>().mockReturnValue(true);
  const runIds = vi.fn<TaskFeedGate['runIds']>().mockReturnValue(LISTED_IDS);
  const gate: TaskFeedGate = { canPost, state: () => GRAPH_STATE_STUB, runIds, persistentIds: () => persistentIds, tasks: () => [] };
  const base = feedsOf(runs);
  const feeds: GraphFeeds = { ...base, progress: fake.progress };
  const feed = new GraphTaskFeed({ root: '/ws', ports, gate, feeds });

  fake.recordsOf.mockImplementation(recordsOfA(A_UNDER_WEB_BUILD));
  feed.start();

  const fixture: ProgressFeedFixture = { feed, runs, ports, fake, canPost, runIds };

  return fixture;
};

describe('FEATURE: run progress in the graph feed (spec D11)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a started feed for /ws with a ready page and a#build listed', () => {
    it('WHEN progress changes for /ws THEN one runs post follows after 50 ms with a#build running under web#build', () => {
      const { ports, fake } = startedFeed();

      fake.changed('/ws');
      vi.advanceTimersByTime(50);

      expect(postedRunsMessagesOf(ports)).toStrictEqual([A_OWNED_BY_WEB_BUILD]);
    });

    it('WHEN progress changes for /other THEN nothing is posted', () => {
      const { ports, fake } = startedFeed();

      fake.changed('/other');
      vi.advanceTimersByTime(100);

      expect(postedRunsMessagesOf(ports)).toStrictEqual([]);
    });

    it('WHEN progress changes 5 times and the store once THEN nothing is posted before 50 ms', () => {
      const { runs, ports, fake } = startedFeed();

      for (let change = 0; change < 5; change += 1) fake.changed('/ws');

      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(49);

      expect(postedRunsMessagesOf(ports)).toStrictEqual([]);
    });

    it('WHEN progress changes 5 times to different owners inside 50 ms THEN exactly one post follows', () => {
      const { ports, fake } = startedFeed();

      for (let change = 0; change < 5; change += 1) {
        // Owners alternate, so each change is a new map and dedupe cannot hide a post the listener makes itself.
        const record = change % 2 === 0 ? A_UNDER_WEB_BUILD : A_UNDER_WEB_LINT;

        fake.recordsOf.mockImplementation(recordsOfA(record));
        fake.changed('/ws');
      }

      vi.advanceTimersByTime(100);

      expect(postedRunsMessagesOf(ports)).toHaveLength(1);
    });

    it('WHEN progress changes 5 times and the store once inside 50 ms THEN the two sources share one post', () => {
      const { runs, ports, fake } = startedFeed();

      for (let change = 0; change < 5; change += 1) fake.changed('/ws');

      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(100);

      expect(postedRunsMessagesOf(ports)).toHaveLength(1);
    });

    it('WHEN recordsOf would throw THEN the change listener reads no records and does not throw', () => {
      const { fake } = startedFeed();

      fake.recordsOf.mockImplementation(() => {
        throw new Error('records are mid-change');
      });

      expect(() => {
        fake.changed('/ws');
      }).not.toThrow();
    });

    it('WHEN progress changes THEN gate.runIds is not called before the timer', () => {
      const { fake, runIds } = startedFeed();

      fake.changed('/ws');

      expect(runIds).not.toHaveBeenCalled();
    });

    it('WHEN the page is not ready and progress changes THEN nothing arms', () => {
      const { fake, canPost } = startedFeed();

      canPost.mockReturnValue(false);
      fake.changed('/ws');

      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN the feed is stopped THEN it holds no progress listener', () => {
      const { feed, fake } = startedFeed();

      feed.stop();

      expect(fake.listenerCount()).toBe(0);
    });

    it('WHEN the feed is stopped THEN a progress change posts nothing', () => {
      const { feed, ports, fake } = startedFeed();

      feed.stop();
      fake.changed('/ws');
      vi.advanceTimersByTime(100);

      expect(postedRunsMessagesOf(ports)).toStrictEqual([]);
    });
  });

  describe('GIVEN the same map was posted', () => {
    it('WHEN a change leaves the map equal THEN no second post', () => {
      const { ports, fake } = startedFeed();

      fake.changed('/ws');
      vi.advanceTimersByTime(50);
      fake.changed('/ws');
      vi.advanceTimersByTime(50);

      expect(postedRunsMessagesOf(ports)).toStrictEqual([A_OWNED_BY_WEB_BUILD]);
    });

    it('WHEN the page reloads (flush) THEN the map is posted again', () => {
      const { feed, ports, fake } = startedFeed();

      fake.changed('/ws');
      vi.advanceTimersByTime(50);
      feed.flush(GRAPH_STATE_STUB);

      expect(postedRunsMessagesOf(ports)).toStrictEqual([A_OWNED_BY_WEB_BUILD, A_OWNED_BY_WEB_BUILD]);
    });

    it('WHEN only owners changes THEN a post follows with the new owner', () => {
      const { ports, fake } = startedFeed();

      fake.changed('/ws');
      vi.advanceTimersByTime(50);
      fake.recordsOf.mockImplementation(recordsOfA(A_UNDER_WEB_BUILD, A_UNDER_WEB_LINT));
      fake.changed('/ws');
      vi.advanceTimersByTime(50);

      expect(postedRunsMessagesOf(ports).at(-1)?.owners).toStrictEqual({ 'a#build': 'web#lint' });
    });
  });

  it('GIVEN a running persistent a#build under web#build WHEN posted THEN its word is continuous', () => {
    const { ports, fake } = startedFeed(new Set(['a#build']));

    fake.changed('/ws');
    vi.advanceTimersByTime(50);

    expect(postedRunsMessagesOf(ports).at(-1)?.runs).toStrictEqual({ 'a#build': 'continuous' });
  });
});
