import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { GraphStateRouting } from './graph-state-routing.ts';
import { packageTasksOf, taskModeOf } from './graph-task-wiring.ts';
import { wireToolbar } from './graph-toolbar-actions.ts';
import { viewHandlersOf } from './graph-view-handlers.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphController, GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { LayoutEngine, ProbeFacts } from '../common/graph-probe.type.ts';
import { isGraphHostMessage } from '../utils/graph-host-message.util.ts';
import { readGraphViewState } from '../utils/graph-view-state.util.ts';

/**
 * Routes the host's messages and the view's events by mode: the package side shows the states and draws the package
 * graph; task mode draws the task graph, and `GraphStateRouting` holds a new package hash meanwhile.
 */
class GraphPageController {
  public readonly view: GraphView;

  private readonly deps: GraphControllerDeps;
  private readonly frames: GraphFrames;
  private readonly packages: GraphPackageSide;
  private readonly tasks: ReturnType<typeof taskModeOf>;
  private readonly routing: GraphStateRouting;

  public constructor(deps: GraphControllerDeps) {
    const { bridge, page } = deps;
    const frames = new GraphFrames(deps.now);
    const saved = readGraphViewState(bridge.savedState());
    const modes = new ViewStateModes(deps.saver, saved);
    const handlers = viewHandlersOf({
      frames,
      filtering: () => this.packages.filtering,
      layouts: () => this.packages.layouts,
      tasks: () => this.tasks
    });
    const tasks = packageTasksOf((): ReturnType<typeof taskModeOf> => this.tasks, deps.now);
    const onMessage = (): void => this.tasks.suspend();

    this.deps = deps;
    this.frames = frames;
    this.view = deps.createView(page.container, handlers);
    this.packages = new GraphPackageSide(deps, this.view, { frames, modes, tasks, onMessage });
    this.tasks = taskModeOf(deps, this.view, { modes, frames, onExit: (): void => this.routing.exitTasks() });
    this.routing = new GraphStateRouting({ tasks: this.tasks, packages: this.packages, now: deps.now });
    const relayout = (): void => this.relayout();

    wireToolbar({ page, view: this.view, bridge, background: deps.background, relayout });
  }

  public receive(message: unknown): void {
    const at = this.deps.now();

    if (!isGraphHostMessage(message)) return;

    if (message.type === 'state') this.routing.show(message.state, at);
    else if (message.type === 'showTasks') this.tasks.showTasks(message.taskIds, at);
    else if (message.type === 'edgeExplained') this.packages.filtering.inspection.explained(message);
    else this.tasks.selection.runs(message.runs);
  }

  public facts(): ProbeFacts {
    const { filtering, layouts } = this.packages;
    const filteringFacts = filtering.facts();
    const facts: ProbeFacts = {
      firstFrameMs: (): number | null => this.frames.firstFrameMs(),
      layoutEngine: (): LayoutEngine | null => this.engine(),
      grouped: (): boolean => layouts.mode() === 'folders',
      ...filteringFacts
    };

    return facts;
  }

  /** Re-layout and Retry act on the graph of the mode on screen. */
  private relayout(): void {
    const isTaskMode = this.tasks.isActive();

    if (isTaskMode) {
      void this.tasks.relayout();

      return;
    }

    void this.packages.guard(async (): Promise<void> => this.packages.layouts.relayout());
  }

  private engine(): LayoutEngine | null {
    const isTaskMode = this.tasks.isActive();

    if (isTaskMode) return this.tasks.engine();

    return this.packages.layouts.engine();
  }
}

/** The graph page's controller; until the first valid host state nothing runs, so the page keeps its pre-state. */
export const createGraphController = (deps: GraphControllerDeps): GraphController => {
  const page = new GraphPageController(deps);
  const receive = (message: unknown): void => page.receive(message);
  const controller: GraphController = { receive, view: page.view, facts: page.facts() };

  return controller;
};
