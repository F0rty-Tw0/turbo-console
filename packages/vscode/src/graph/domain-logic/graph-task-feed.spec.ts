import type { GraphShowRequest, GraphState } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskFeed } from './graph-task-feed.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { SHARED_ATOMS_STUB } from '../../tree/test/stubs/shared-atoms.stub.ts';
import type { GraphPorts, TaskFeedGate } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB, GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { RUN_A_BUILD_STUB } from '../test/stubs/graph-run.stub.ts';
import { postedRunsOf, postedShowTasksOf, postedTypesOf } from '../test/utils/graph-session-runs.spec.util.ts';

type FeedFixture = {
  readonly feed: GraphTaskFeed;
  readonly runs: RunStore;
  readonly ports: GraphPorts;
  readonly gate: TaskFeedGate;
};

const LOADING: GraphState = { kind: 'loading' };
const ERROR: GraphState = { kind: 'error', message: 'failed' };
const SINGLE_PACKAGE: GraphState = { ...GRAPH_STATE_STUB, singlePackage: true, rootLabel: 'single-app' };
const SHOW_WEB: GraphShowRequest = { type: 'showPackage', name: 'web' };
const SHOW_A_BUILD: GraphShowRequest = { type: 'showTasks', taskIds: ['a#build'] };

/** A feed on `/ws` over a real `RunStore` and spy ports; its gate is open and shows `state`. */
const feedAt = (state: GraphState): FeedFixture => {
  const runs = new RunStore();
  const ports = graphPortsMock();
  const canPost = vi.fn<TaskFeedGate['canPost']>().mockReturnValue(true);
  const stateOf = vi.fn<TaskFeedGate['state']>().mockReturnValue(state);
  const runIds = vi.fn<TaskFeedGate['runIds']>().mockReturnValue(GRAPH_TASKS_STUB.map((task) => task.id));
  const gate: TaskFeedGate = { canPost, state: stateOf, runIds };
  const feed = new GraphTaskFeed({ root: '/ws', runs, ports, gate, atoms: SHARED_ATOMS_STUB });
  const fixture: FeedFixture = { feed, runs, ports, gate };

  return fixture;
};

describe('FEATURE: graph task feed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN an open gate on a graph state', () => {
    it('WHEN showTasks is called THEN the request is posted at once', () => {
      const { feed, ports } = feedAt(GRAPH_STATE_STUB);

      feed.show(SHOW_A_BUILD);

      expect(postedShowTasksOf(ports)).toStrictEqual([SHOW_A_BUILD]);
    });

    it('WHEN a request was posted at once and a state is flushed THEN it is not posted again', () => {
      const { feed, ports } = feedAt(GRAPH_STATE_STUB);

      feed.show(SHOW_A_BUILD);
      feed.flush(GRAPH_STATE_STUB);

      expect(postedShowTasksOf(ports)).toStrictEqual([SHOW_A_BUILD]);
    });

    it('WHEN a run starts THEN the timer reads the run ids from the gate', () => {
      const { feed, runs, gate } = feedAt(GRAPH_STATE_STUB);

      feed.start();
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(50);

      expect(gate.runIds).toHaveBeenCalledOnce();
    });

    it('WHEN a run starts THEN the timer does not build the state', () => {
      const { feed, runs, gate } = feedAt(GRAPH_STATE_STUB);

      feed.start();
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(50);

      expect(gate.state).not.toHaveBeenCalled();
    });

    it('WHEN a run starts THEN the map posted after 50 ms has its state', () => {
      const { feed, runs, ports } = feedAt(GRAPH_STATE_STUB);

      feed.start();
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      vi.advanceTimersByTime(50);

      expect(postedRunsOf(ports)).toStrictEqual([{ 'a#build': 'running' }]);
    });
  });

  describe.each([
    ['loading', LOADING],
    ['error', ERROR]
  ])('GIVEN an open gate on a %s state', (_label, state) => {
    it('WHEN showTasks is called THEN nothing is posted', () => {
      const { feed, ports } = feedAt(state);

      feed.show(SHOW_A_BUILD);

      expect(postedShowTasksOf(ports)).toStrictEqual([]);
    });

    it('WHEN showTasks is called THEN the hold is logged once with the root and the state kind', () => {
      const { feed, ports } = feedAt(state);

      feed.show(SHOW_A_BUILD);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith(`Holding showTasks for /ws until the graph loads: state is ${state.kind}`);
    });

    it('WHEN showTasks is called and the graph state is flushed THEN the request follows the runs', () => {
      const { feed, ports } = feedAt(state);

      feed.show(SHOW_A_BUILD);
      feed.flush(GRAPH_STATE_STUB);

      expect(postedTypesOf(ports)).toStrictEqual(['runs', 'showTasks']);
    });

    it('WHEN showTasks is called and this state is flushed THEN the request stays held', () => {
      const { feed, ports } = feedAt(state);

      feed.show(SHOW_A_BUILD);
      feed.flush(state);
      feed.flush(GRAPH_STATE_STUB);

      expect(postedShowTasksOf(ports)).toStrictEqual([SHOW_A_BUILD]);
    });

    it('WHEN this state is flushed with the request held THEN no showTasks is posted yet', () => {
      const { feed, ports } = feedAt(state);

      feed.show(SHOW_A_BUILD);
      feed.flush(state);

      expect(postedShowTasksOf(ports)).toStrictEqual([]);
    });
  });

  describe('GIVEN an open gate on a loading state with a showPackage request', () => {
    it('WHEN showPackage is called THEN the hold is logged with the request type', () => {
      const { feed, ports } = feedAt(LOADING);

      feed.show(SHOW_WEB);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('Holding showPackage for /ws until the graph loads: state is loading');
    });

    it('WHEN the graph state is flushed THEN the request follows the runs', () => {
      const { feed, ports } = feedAt(LOADING);

      feed.show(SHOW_WEB);
      feed.flush(GRAPH_STATE_STUB);

      expect(postedTypesOf(ports)).toStrictEqual(['runs', 'showPackage']);
    });
  });

  describe('GIVEN a gate that cannot post', () => {
    it('WHEN showTasks is called twice THEN the second request is the one the graph state flushes', () => {
      const { feed, ports, gate } = feedAt(GRAPH_STATE_STUB);

      vi.mocked(gate.canPost).mockReturnValue(false);
      feed.show(SHOW_A_BUILD);
      feed.show({ type: 'showTasks', taskIds: ['web#build'] });
      feed.flush(GRAPH_STATE_STUB);

      expect(postedShowTasksOf(ports)).toStrictEqual([{ type: 'showTasks', taskIds: ['web#build'] }]);
    });

    it('WHEN the held request meets a single-package state THEN nothing is posted', () => {
      const { feed, ports, gate } = feedAt(LOADING);

      vi.mocked(gate.canPost).mockReturnValue(false);
      feed.show(SHOW_A_BUILD);
      feed.flush(SINGLE_PACKAGE);

      expect(postedShowTasksOf(ports)).toStrictEqual([]);
    });

    it('WHEN the held request meets a single-package state THEN it is logged as held, then ignored once', () => {
      const { feed, ports, gate } = feedAt(LOADING);

      vi.mocked(gate.canPost).mockReturnValue(false);
      feed.show(SHOW_A_BUILD);
      feed.flush(SINGLE_PACKAGE);

      expect(vi.mocked(ports.log).mock.calls).toStrictEqual([
        ['Holding showTasks for /ws until the graph loads: state is loading'],
        ['Ignored showTasks: a single-package root has no task graph']
      ]);
    });

    it('WHEN the held request meets a single-package state THEN a later graph state does not post it', () => {
      const { feed, ports, gate } = feedAt(LOADING);

      vi.mocked(gate.canPost).mockReturnValue(false);
      feed.show(SHOW_A_BUILD);
      feed.flush(SINGLE_PACKAGE);
      feed.flush(GRAPH_STATE_STUB);

      expect(postedShowTasksOf(ports)).toStrictEqual([]);
    });

    it('WHEN a run starts THEN no timer is armed', () => {
      const { feed, runs, gate } = feedAt(GRAPH_STATE_STUB);

      vi.mocked(gate.canPost).mockReturnValue(false);
      feed.start();
      runs.tryStart(RUN_A_BUILD_STUB, 1000);

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('GIVEN an open gate on a single-package state', () => {
    it('WHEN showTasks is called THEN nothing is posted', () => {
      const { feed, ports } = feedAt(SINGLE_PACKAGE);

      feed.show(SHOW_A_BUILD);

      expect(postedShowTasksOf(ports)).toStrictEqual([]);
    });

    it('WHEN showTasks is called THEN the request is logged once', () => {
      const { feed, ports } = feedAt(SINGLE_PACKAGE);

      feed.show(SHOW_A_BUILD);

      expect(ports.log).toHaveBeenCalledOnce();
    });

    it('WHEN showPackage is called THEN it is dropped with the package graph wording', () => {
      const { feed, ports } = feedAt(SINGLE_PACKAGE);

      feed.show(SHOW_WEB);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('Ignored showPackage: a single-package root has no package graph');
    });
  });

  describe('GIVEN a run change that armed the timer', () => {
    it('WHEN a state is flushed inside the window THEN the timer is cancelled and only the flush posts the map', () => {
      const { feed, runs, ports } = feedAt(GRAPH_STATE_STUB);

      feed.start();
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      feed.flush(GRAPH_STATE_STUB);
      vi.advanceTimersByTime(100);

      expect(postedRunsOf(ports)).toStrictEqual([{ 'a#build': 'running' }]);
    });

    it('WHEN the feed is stopped THEN no timer is left', () => {
      const { feed, runs } = feedAt(GRAPH_STATE_STUB);

      feed.start();
      runs.tryStart(RUN_A_BUILD_STUB, 1000);
      feed.stop();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('GIVEN a feed that was started twice', () => {
    it('WHEN it is stopped THEN the runs listener was subscribed once', () => {
      const { feed, runs } = feedAt(GRAPH_STATE_STUB);
      const off = vi.fn();
      const subscribe = vi.spyOn(runs, 'onDidChange').mockReturnValue(off);

      feed.start();
      feed.start();
      feed.stop();

      expect(subscribe).toHaveBeenCalledOnce();
    });

    it('WHEN it is stopped THEN the one subscription is unsubscribed', () => {
      const { feed, runs } = feedAt(GRAPH_STATE_STUB);
      const off = vi.fn();

      vi.spyOn(runs, 'onDidChange').mockReturnValue(off);
      feed.start();
      feed.start();
      feed.stop();

      expect(off).toHaveBeenCalledOnce();
    });
  });
});
