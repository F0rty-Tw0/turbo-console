import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { packageRunsOf } from '../utils/package-run.util.ts';

/**
 * The run state drawn on the packages of package mode (spec D13): it keeps the latest host runs and the tasks the graph
 * lists, and writes the packages' strongest states through the parked view, so it writes nothing while task mode owns the canvas.
 */
export class GraphPackageRuns {
  private readonly view: GraphView;
  private latest: TaskRuns = {};
  private tasks: GraphTask[] = [];

  public constructor(view: GraphView) {
    this.view = view;
  }

  /** The host sent run states. */
  public runs(runs: TaskRuns): void {
    this.latest = runs;
    this.mark();
  }

  /** The graph lists these tasks. */
  public listed(tasks: GraphTask[]): void {
    this.tasks = tasks;
    this.mark();
  }

  /** Draws the states of the latest runs over the listed tasks, e.g. after the canvas was drawn again. */
  public mark(): void {
    const packageRuns = packageRunsOf(this.latest, this.tasks);

    this.view.setPackageRuns(packageRuns);
  }
}
