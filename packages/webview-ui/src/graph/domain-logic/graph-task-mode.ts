import { GraphTaskLayout } from './graph-task-layout.ts';
import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import type { TaskLayoutRequest, TaskModeDeps } from '../common/graph-task.type.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';
import { shownSetOf } from '../utils/shown-set.util.ts';

/** The tasks the task view's choice draws, and the key of their layout. */
const requestOf = (tasks: GraphTask[], task: TaskViewState): TaskLayoutRequest => {
  const { chosen, depth, capLifted } = task;
  const shownSet = shownSetOf({ tasks, chosen, depth, capLifted });
  const shown = new Set(shownSet.ids);
  const drawn = tasks.filter((graphTask) => shown.has(graphTask.id));
  const request: TaskLayoutRequest = { tasks: drawn, shown, key: taskLayoutKeyOf(drawn, shown) };

  return request;
};

/**
 * Task mode's state and routing: whether it is active, the host's latest tasks and hash, and the task view it saves.
 * Its layout lives in `GraphTaskLayout`; the package graph is parked meanwhile.
 */
export class GraphTaskMode {
  private readonly deps: TaskModeDeps;
  private readonly layout: GraphTaskLayout;
  private tasks: GraphTask[] = [];
  private hash = '';
  private hasEntered = false;

  public constructor(deps: TaskModeDeps) {
    this.deps = deps;
    this.layout = new GraphTaskLayout({
      ...deps,
      saved: (): TaskViewState | null => deps.modes.task(),
      onPlaced: (): void => this.saveCamera()
    });
  }

  public isActive(): boolean {
    return this.deps.modes.mode() === 'tasks';
  }

  /** Keeps the state's tasks; while active, shows the graph view once and lays out the shown tasks when their key changed. */
  public received(state: GraphReady, at: number): void {
    const task = this.deps.modes.task();

    this.tasks = state.tasks;
    this.hash = state.hash;

    if (!this.isActive() || task === null) return;

    this.enter();

    const request = requestOf(this.tasks, task);
    const shownKey = this.layout.key();

    if (request.key === shownKey) return;

    this.deps.frames.start(at);
    void this.layout.show(request);
  }

  /** Saves the camera on screen and the key of the layout under it; nothing before a task layout is placed. */
  public saveCamera(): void {
    const task = this.deps.modes.task();
    const layoutKey = this.layout.placedKey();

    if (!this.isActive() || task === null || layoutKey === null) return;

    const { zoom, pan } = this.deps.view.viewport();
    const saved: TaskViewState = { ...task, zoom, pan, layoutKey };

    this.deps.modes.saveTask(saved, this.hash);
  }

  /** A drag only moves the layout kept in page memory; nothing is posted. */
  public dragged(): void {
    this.layout.dragged();
  }

  public engine(): LayoutEngine | null {
    return this.layout.engine();
  }

  public async relayout(): Promise<void> {
    await this.layout.relayout();
  }

  /** The toolbar and the body show at the first task state, before any task layout lands. */
  private enter(): void {
    if (this.hasEntered) return;

    this.hasEntered = true;
    this.deps.screen.showGraph(this.engine() === 'fallback');
  }
}
