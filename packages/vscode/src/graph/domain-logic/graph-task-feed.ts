import type { GraphRunsMessage, GraphState, GraphTask } from '@turbo-console/webview-ui';

import type { RunEntry, Runs } from '../../run/common/run.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { runsMapOf } from '../utils/graph-tasks.util.ts';

const NO_TASKS: GraphTask[] = [];

/** `canPost` is the session's check that the panel is shown, ready and alive; `state` is the state as it is now. */
type FeedGate = {
  readonly canPost: () => boolean;
  readonly state: () => GraphState;
};

type TaskFeedDeps = {
  readonly root: string;
  readonly runs: Pick<Runs, 'get' | 'onDidChange'>;
  readonly ports: Pick<GraphPorts, 'post' | 'log'>;
  readonly gate: FeedGate;
};

const tasksOf = (state: GraphState): GraphTask[] => (state.kind === 'graph' ? state.tasks : NO_TASKS);

/**
 * What a graph panel is told about tasks besides its state: the run states of its root, coalesced so a burst of task
 * events is one post, and the one `showTasks` request held until the page can take it. `flush` is the one point that
 * posts the full map and the held request, right after a state is posted.
 */
export class GraphTaskFeed {
  private readonly deps: TaskFeedDeps;
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private held: string[] | null = null;

  public constructor(deps: TaskFeedDeps) {
    this.deps = deps;
  }

  public start(): void {
    this.unsubscribe = this.deps.runs.onDidChange((entry) => {
      this.changed(entry);
    });
  }

  public stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cancelTimer();
    this.held = null;
  }

  public flush(state: GraphState): void {
    this.cancelTimer();
    this.postRuns(tasksOf(state));
    this.postHeld();
  }

  /** The latest request wins while the page cannot take it; a single-package root has no task graph to show. */
  public showTasks(taskIds: string[]): void {
    const { gate, ports } = this.deps;
    const state = gate.state();

    if (state.kind === 'singlePackage') {
      ports.log(logTextOf('Ignored showTasks: a single-package root has no task graph'));

      return;
    }

    const canPost = gate.canPost();

    if (!canPost) {
      this.held = taskIds;

      return;
    }

    ports.post({ type: 'showTasks', taskIds });
  }

  private changed(entry: RunEntry): void {
    if (entry.root !== this.deps.root) return;

    this.armTimer();
  }

  private armTimer(): void {
    const canPost = this.deps.gate.canPost();

    if (!canPost || this.timer !== null) return;

    this.timer = setTimeout(() => {
      this.fire();
    }, RUNS_COALESCE_MS);
  }

  private fire(): void {
    this.timer = null;

    const canPost = this.deps.gate.canPost();

    if (!canPost) return;

    const state = this.deps.gate.state();

    this.postRuns(tasksOf(state));
  }

  private cancelTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);

    this.timer = null;
  }

  private postRuns(tasks: GraphTask[]): void {
    const { root, runs, ports } = this.deps;
    const map = runsMapOf(root, tasks, runs.get);
    const message: GraphRunsMessage = { type: 'runs', runs: map };

    ports.post(message);
  }

  private postHeld(): void {
    if (this.held === null) return;

    const taskIds = this.held;

    this.held = null;
    this.deps.ports.post({ type: 'showTasks', taskIds });
  }
}
