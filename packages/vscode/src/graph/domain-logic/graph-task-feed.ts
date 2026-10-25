import type { GraphRunsMessage, GraphState } from '@turbo-console/webview-ui';

import { Coalescer } from './coalescer.ts';
import { GraphAtomFeed } from './graph-atom-feed.ts';
import type { RunEntry, Runs } from '../../run/common/run.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { SharedAtoms } from '../../tree/common/atom-load.type.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphPorts, TaskFeedGate } from '../common/graph.type.ts';
import { runIdsOf, runsMapOf } from '../utils/graph-tasks.util.ts';

type TaskFeedDeps = {
  readonly root: string;
  readonly runs: Pick<Runs, 'get' | 'onDidChange'>;
  readonly ports: Pick<GraphPorts, 'post' | 'log'>;
  readonly gate: TaskFeedGate;
  readonly atoms: Pick<SharedAtoms, 'onDidChange' | 'view'>;
};

/**
 * What a graph panel is told about tasks besides its state: the run states of its root, coalesced so a burst of task
 * events is one post, the Atomizer counts of its groups (a `GraphAtomFeed`) and the one `showTasks` request held until the
 * page can take it. `showTasks` is never posted before a `graph` state: `flush` is the one point that posts the full runs
 * map, the atoms and the held request, in that order, right after a state is posted.
 */
export class GraphTaskFeed {
  private readonly deps: TaskFeedDeps;
  private unsubscribe: (() => void) | null = null;
  private readonly coalescer: Coalescer;
  private held: string[] | null = null;
  private readonly atomFeed: GraphAtomFeed;

  public constructor(deps: TaskFeedDeps) {
    this.deps = deps;
    this.coalescer = new Coalescer(RUNS_COALESCE_MS, () => {
      this.fire();
    });
    this.atomFeed = new GraphAtomFeed({ root: deps.root, atoms: deps.atoms, ports: deps.ports, gate: deps.gate });
  }

  public start(): void {
    this.atomFeed.start();

    if (this.unsubscribe !== null) return;

    this.unsubscribe = this.deps.runs.onDidChange((entry) => {
      this.changed(entry);
    });
  }

  public stop(): void {
    this.atomFeed.stop();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.coalescer.cancel();
    this.held = null;
  }

  public flush(state: GraphState): void {
    this.coalescer.cancel();
    this.postRuns(runIdsOf(state));
    this.atomFeed.flush(state);
    this.postHeld(state);
  }

  /**
   * The latest request wins while the page cannot take it, which is until a `graph` state has been posted; a hold while the
   * state is not `graph` is logged, so a root stuck in `error` leaves a trace. A single-package root has no task graph to show.
   */
  public showTasks(taskIds: string[]): void {
    const { gate, ports } = this.deps;
    const state = gate.state();

    if (state.kind === 'singlePackage') {
      this.ignoreSinglePackage();

      return;
    }

    const canPost = gate.canPost();

    if (!canPost || state.kind !== 'graph') {
      this.hold(taskIds, state);

      return;
    }

    ports.post({ type: 'showTasks', taskIds });
  }

  private hold(taskIds: string[], state: GraphState): void {
    this.held = taskIds;

    if (state.kind === 'graph') return;

    const text = `Holding showTasks for ${this.deps.root} until the graph loads: state is ${state.kind}`;

    this.deps.ports.log(logTextOf(text));
  }

  private changed(entry: RunEntry): void {
    if (entry.root !== this.deps.root) return;

    const canPost = this.deps.gate.canPost();

    if (canPost) this.coalescer.arm();
  }

  private fire(): void {
    const canPost = this.deps.gate.canPost();

    if (!canPost) return;

    this.postRuns(this.deps.gate.runIds());
  }

  private postRuns(ids: string[]): void {
    const { root, runs, ports } = this.deps;
    const map = runsMapOf(root, ids, runs.get);
    const message: GraphRunsMessage = { type: 'runs', runs: map };

    ports.post(message);
  }

  private ignoreSinglePackage(): void {
    this.deps.ports.log(logTextOf('Ignored showTasks: a single-package root has no task graph'));
  }

  private postHeld(state: GraphState): void {
    if (this.held === null) return;

    if (state.kind === 'singlePackage') {
      this.held = null;
      this.ignoreSinglePackage();

      return;
    }

    if (state.kind !== 'graph') return;

    const taskIds = this.held;

    this.held = null;
    this.deps.ports.post({ type: 'showTasks', taskIds });
  }
}
