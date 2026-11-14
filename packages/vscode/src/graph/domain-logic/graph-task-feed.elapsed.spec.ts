import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskFeed } from './graph-task-feed.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphFeeds, GraphPorts, TaskFeedGate } from '../common/graph.type.ts';
import { GRAPH_WALL_NOW } from '../test/common/graph-ports.const.ts';
import type { ProgressFake } from '../test/common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB, GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { A_BUILD_DEFINITION_STUB, RUN_A_BUILD_STUB } from '../test/stubs/graph-run.stub.ts';
import { feedsOf, progressFake } from '../test/utils/graph-feeds.spec.util.ts';
import { postedRunsMessagesOf } from '../test/utils/graph-session-runs.spec.util.ts';

type ElapsedFixture = {
  readonly feed: GraphTaskFeed;
  readonly runs: RunStore;
  readonly ports: GraphPorts;
  readonly progress: ProgressFake;
};

const LISTED_IDS = GRAPH_TASKS_STUB.map((task) => task.id);

/** A started feed on `/ws` over an open gate listing `GRAPH_TASKS_STUB`; its wall clock reads `GRAPH_WALL_NOW` (4000). */
const startedFeed = (): ElapsedFixture => {
  const runs = new RunStore();
  const ports = graphPortsMock();
  const progress = progressFake();
  const gate: TaskFeedGate = {
    canPost: () => true,
    state: () => GRAPH_STATE_STUB,
    runIds: () => LISTED_IDS,
    persistentIds: () => new Set(),
    tasks: () => []
  };
  const feeds: GraphFeeds = feedsOf(runs, undefined, undefined, progress.progress);
  const feed = new GraphTaskFeed({ root: '/ws', ports, gate, feeds });

  feed.start();

  const fixture: ElapsedFixture = { feed, runs, ports, progress };

  return fixture;
};

describe('FEATURE: the graph feed posts elapsed and dedupes on launches (spec §2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a run of a#build launched at 1000', () => {
    it('WHEN the timer fires THEN the posted message carries elapsed from the wall clock', () => {
      const { runs, ports } = startedFeed();

      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedRunsMessagesOf(ports).at(-1)?.elapsed).toStrictEqual({ 'a#build': GRAPH_WALL_NOW - 1000 });
    });

    it('WHEN only the wall clock moved before the next fire THEN nothing is posted again', () => {
      const { runs, ports, progress } = startedFeed();

      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);
      vi.mocked(ports.wallNow).mockReturnValue(GRAPH_WALL_NOW + 5000);
      progress.changed('/ws');
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      const posted = postedRunsMessagesOf(ports);

      expect(posted).toHaveLength(1);
      expect(posted[0]?.elapsed).toStrictEqual({ 'a#build': 3000 });
    });

    it('WHEN it ends, is relaunched at 1020 inside one coalesce window and the clock reads 9000 THEN a second message posts the elapsed from 9000', () => {
      const { runs, ports } = startedFeed();

      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);
      runs.processEnded(A_BUILD_DEFINITION_STUB, 0, 1010);
      runs.tryStart(RUN_A_BUILD_STUB, 1020);
      vi.mocked(ports.wallNow).mockReturnValue(9000);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      const posted = postedRunsMessagesOf(ports);

      expect(posted).toHaveLength(2);
      expect(posted.at(-1)?.runs).toStrictEqual({ 'a#build': 'running' });
      expect(posted.at(-1)?.elapsed).toStrictEqual({ 'a#build': 9000 - 1020 });
    });

    it('WHEN the run ends THEN the next message has no elapsed key', () => {
      const { runs, ports } = startedFeed();

      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);
      runs.processEnded(A_BUILD_DEFINITION_STUB, 0, 1010);
      vi.advanceTimersByTime(RUNS_COALESCE_MS);

      expect(postedRunsMessagesOf(ports).at(-1)).not.toHaveProperty('elapsed');
    });
  });
});
