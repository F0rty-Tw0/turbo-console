import type { GraphRunsMessage, GraphShowRequest, GraphState } from '@turbo-console/webview-ui';

import { Coalescer } from './coalescer.ts';
import { GraphAffectedFeed } from './graph-affected-feed.ts';
import { GraphAtomFeed } from './graph-atom-feed.ts';
import type { ProgressRecord } from '../../run/common/run-progress.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { NO_GRAPH_PREDICTIONS, RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphFeeds, GraphPorts, RunSources, TaskFeedGate } from '../common/graph.type.ts';
import { predictionsOf } from '../utils/graph-predictions.util.ts';
import { runIdsOf, runsMessageOf } from '../utils/graph-tasks.util.ts';

const isSinglePackageState = (state: GraphState): boolean => state.kind === 'graph' && state.singlePackage;

/** A single-package root has a task graph but no package graph, so only `showPackage` is refused there. */
const isRefused = (request: GraphShowRequest, state: GraphState): boolean => {
  const isSingle = isSinglePackageState(state);

  return request.type === 'showPackage' && isSingle;
};

type TaskFeedDeps = {
  readonly root: string;
  readonly ports: Pick<GraphPorts, 'post' | 'log'>;
  readonly gate: TaskFeedGate;
  readonly feeds: GraphFeeds;
};

/**
 * What a graph panel is told about tasks besides its state: the run words and owners of its root, merged from its own runs and
 * the task progress (spec D11) and coalesced so a burst of task events, progress or prediction changes is one post, the cache
 * prediction of its tasks while the prediction toggle is on, the affected marks (a `GraphAffectedFeed`), the Atomizer counts of its
 * groups (a `GraphAtomFeed`) and the one `showTasks` or `showPackage` request held until the page can take it. A coalesced post that
 * equals the last one sent is skipped, and a post carries `predictions` or `affected` only when they changed since the last one sent:
 * an absent key leaves the page's marks as they are. A request is never posted before a `graph` state: `flush` is the one point that posts the
 * full runs message, always, the atoms and the held request, in that order, right after a state is posted.
 */
export class GraphTaskFeed {
  private readonly deps: TaskFeedDeps;
  private unsubscribes: (() => void)[] = [];
  private readonly coalescer: Coalescer;
  private lastRuns: string | null = null;
  private lastPredictions: string | null = null;
  private held: GraphShowRequest | null = null;
  private readonly atomFeed: GraphAtomFeed;
  private readonly affectedFeed: GraphAffectedFeed;

  public constructor(deps: TaskFeedDeps) {
    this.deps = deps;
    this.coalescer = new Coalescer(RUNS_COALESCE_MS, () => {
      this.fire();
    });
    this.atomFeed = new GraphAtomFeed({ root: deps.root, atoms: deps.feeds.atoms, ports: deps.ports, gate: deps.gate });
    this.affectedFeed = new GraphAffectedFeed({ ...deps, changed: this.changed.bind(this) });
  }

  public start(): void {
    this.atomFeed.start();
    this.affectedFeed.start();

    if (this.unsubscribes.length > 0) return;

    const { runs, progress, prediction } = this.deps.feeds;
    const offRuns = runs.onDidChange((entry) => {
      this.changed(entry.root);
    });
    const offProgress = progress.onDidChange((root) => {
      this.changed(root);
    });
    const offPrediction = prediction.onDidChange((root) => {
      this.changed(root);
    });

    this.unsubscribes = [offRuns, offProgress, offPrediction];
  }

  public stop(): void {
    this.atomFeed.stop();
    this.affectedFeed.stop();

    for (const unsubscribe of this.unsubscribes) unsubscribe();

    this.unsubscribes = [];
    this.coalescer.cancel();
    this.held = null;
  }

  public flush(state: GraphState): void {
    this.coalescer.cancel();
    this.affectedFeed.flushed(state);
    this.postRuns(runIdsOf(state), true);
    this.atomFeed.flush(state);
    this.postHeld(state);
  }

  /**
   * The latest request wins while the page cannot take it, which is until a `graph` state has been posted; a hold while the
   * state is not `graph` is logged, so a root stuck in `error` leaves a trace. A `showPackage` on a single-package root is dropped, as it has no package graph.
   */
  public show(request: GraphShowRequest): void {
    const { gate, ports } = this.deps;
    const state = gate.state();

    const refused = isRefused(request, state);

    if (refused) {
      this.ignoreSinglePackage();

      return;
    }

    const canPost = gate.canPost();

    if (!canPost || state.kind !== 'graph') {
      this.hold(request, state);

      return;
    }

    ports.post(request);
  }

  private hold(request: GraphShowRequest, state: GraphState): void {
    this.held = request;

    if (state.kind === 'graph') return;

    const text = `Holding ${request.type} for ${this.deps.root} until the graph loads: state is ${state.kind}`;

    this.deps.ports.log(logTextOf(text));
  }

  /**
   * Runs on the call stack of a run change, a progress `begin`, `event` or `prune`, or a cache prediction change, which do not
   * catch: it reads no run, no record and no prediction, it only arms the timer, so `fire` does the reads on its own stack.
   */
  private changed(root: string): void {
    if (root !== this.deps.root) return;

    const canPost = this.deps.gate.canPost();

    if (canPost) this.coalescer.arm();
  }

  private fire(): void {
    const canPost = this.deps.gate.canPost();

    if (!canPost) return;

    this.postRuns(this.deps.gate.runIds(), false);
  }

  /**
   * Skips a message whose runs and owners equal the last ones sent and whose predictions and affected marks did not change, unless `isForced`, as a
   * reloaded page needs the message again.
   */
  private postRuns(ids: string[], isForced: boolean): void {
    const { root, feeds, gate, ports } = this.deps;
    const { runs, progress } = feeds;
    const recordsOf = (recordsRoot: string, taskId: string): ProgressRecord[] => progress.recordsOf(recordsRoot, taskId);
    const sources: RunSources = { get: runs.get, recordsOf, persistentIds: gate.persistentIds() };
    const predictions = this.predictionsToPost(isForced);
    const affected = this.affectedFeed.toPost(isForced);
    const message = runsMessageOf(root, ids, sources, predictions);
    const runsText = JSON.stringify([message.runs, message.owners]);
    const isRepeat = !isForced && predictions === null && affected === undefined && runsText === this.lastRuns;

    if (isRepeat) return;

    this.lastRuns = runsText;

    if (affected === undefined) {
      ports.post(message);

      return;
    }

    ports.post({ ...message, affected });
  }

  /**
   * The predictions to post, or `null` so the message has no key and the page keeps its marks: `null` when their JSON equals the
   * one last posted to this page and the post is not forced. A forced post always carries them and resets that memory.
   */
  private predictionsToPost(isForced: boolean): NonNullable<GraphRunsMessage['predictions']> | null {
    const predictions = this.predictionsNow();
    const text = JSON.stringify(predictions);

    if (!isForced && text === this.lastPredictions) return null;

    this.lastPredictions = text;

    return predictions;
  }

  /** The predictions of the listed tasks, or `{}` while the prediction toggle is off, which clears every mark on the page. */
  private predictionsNow(): NonNullable<GraphRunsMessage['predictions']> {
    const { root, feeds, gate } = this.deps;

    const isShown = feeds.toggles.prediction.isShown();

    if (!isShown) return NO_GRAPH_PREDICTIONS;

    return predictionsOf(root, gate.tasks(), feeds.prediction.view);
  }

  private ignoreSinglePackage(): void {
    this.deps.ports.log(logTextOf('Ignored showPackage: a single-package root has no package graph'));
  }

  private postHeld(state: GraphState): void {
    const request = this.held;

    if (request === null) return;

    const refused = isRefused(request, state);

    if (refused) {
      this.held = null;
      this.ignoreSinglePackage();

      return;
    }

    if (state.kind !== 'graph') return;

    this.held = null;
    this.deps.ports.post(request);
  }
}
