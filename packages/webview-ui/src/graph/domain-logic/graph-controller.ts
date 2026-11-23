import { GraphCardClock } from './graph-card-clock.ts';
import { probeFactsOf } from './graph-controller-facts.ts';
import { GraphFrames } from './graph-frames.ts';
import { graphLocationOf } from './graph-location.ts';
import { messageSuspenderOf, modeGroupHiderOf, moduleModeOf, reportDropped, resumeModules } from './graph-module-wiring.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { wirePanelSashes } from './graph-panel-sashes.ts';
import { packageRevealOf } from './graph-reveal.ts';
import { applyRunMarks } from './graph-run-marks.ts';
import { GraphStateRouting } from './graph-state-routing.ts';
import { packageTasksOf, taskModeOf } from './graph-task-wiring.ts';
import { wireToolbar } from './graph-toolbar-actions.ts';
import { viewHandlersOf } from './graph-view-handlers.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphHostMessage, GraphRunsMessage } from '../../bridge/common/graph-message.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';
import type { FlowControl } from '../common/flow.type.ts';
import type { GraphController, GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { ProbeFacts } from '../common/graph-probe.type.ts';
import type { PageReveal } from '../common/graph-reveal.type.ts';
import { NO_OWNERS } from '../common/graph-task.const.ts';
import type { GraphLocation } from '../common/location.type.ts';
import type { PageModuleMode } from '../common/module-mode.type.ts';
import type { PageTaskMode } from '../common/page-task-mode.type.ts';
import { isGraphHostMessage } from '../utils/graph-host-message.util.ts';
import { hasSavedGrouping, readGraphViewState } from '../utils/graph-view-state.util.ts';

/**
 * Routes the host's messages and the view's events by mode: the package side shows the states and draws the package
 * graph; task mode draws the task graph and modules mode one package's modules, and `GraphStateRouting` holds a new
 * package hash meanwhile.
 */
class GraphPageController {
  public readonly view: GraphView;
  public readonly flow: FlowControl;

  private readonly deps: GraphControllerDeps;
  private readonly frames: GraphFrames;
  private readonly packages: GraphPackageSide;
  private readonly tasks: PageTaskMode;
  private readonly modules: PageModuleMode;
  private readonly routing: GraphStateRouting;
  private readonly reveal: PageReveal;
  private readonly location: GraphLocation;
  private readonly clock: GraphCardClock;

  public constructor(deps: GraphControllerDeps) {
    const { bridge, page, widgetViews, now } = deps;
    const frames = new GraphFrames(deps.now);
    const raw = bridge.savedState();
    const saved = readGraphViewState(raw);
    const isGroupingSaved = saved !== null && hasSavedGrouping(raw);
    const modes = new ViewStateModes(deps.saver, saved, isGroupingSaved);
    const handlers = viewHandlersOf({
      frames,
      filtering: () => this.packages.filtering,
      layouts: () => this.packages.layouts,
      tasks: () => this.tasks,
      modules: () => this.modules.input,
      flow: () => this.flow
    });
    const taskMode = (): PageTaskMode => this.tasks;
    const moduleMode = (): PageModuleMode => this.modules;
    const tasks = packageTasksOf(taskMode, deps.now, moduleMode);
    const onMessage = messageSuspenderOf(taskMode, moduleMode);
    const onPlaced = (): void => this.reveal.placed();
    const onLocation = (): void => this.location.update();
    const onExit = (to: GraphViewMode): void => this.routing.exitTo(to);

    this.deps = deps;
    this.frames = frames;
    this.view = deps.createView(page.container, handlers);
    this.flow = deps.createFlow(this.view);
    this.clock = new GraphCardClock({ canvas: this.view.tasks, now: deps.now, ...deps.clockPorts });
    this.packages = new GraphPackageSide(deps, this.view, { frames, modes, tasks, onMessage, onPlaced, onLocation });
    this.modules = moduleModeOf(deps, this.view, { modes, frames, tasks: (): PageTaskMode => this.tasks, onExit });
    this.tasks = taskModeOf(deps, this.view, {
      modes,
      frames,
      onMessage,
      onExit,
      onLocation,
      flow: this.flow,
      selectedPackage: (): string | null => this.packages.filtering.inspection.selected(),
      showPackage: (name: string): void => this.reveal.request(name)
    });
    const hideModes = modeGroupHiderOf(page);

    this.routing = new GraphStateRouting({ tasks: this.tasks, modules: this.modules, packages: this.packages, hideModes, now });
    this.reveal = packageRevealOf(this.tasks, this.packages, this.view);
    this.location = graphLocationOf({ page, widgetViews, modes, packages: this.packages, tasks: this.tasks, reveal: this.reveal });
    const relayout = (): void => this.relayout();
    const showNotice = (text: string | null): void => this.tasks.notice(text);

    wireToolbar({ page, view: this.view, bridge, background: deps.background, relayout, showNotice });
    wirePanelSashes({ root: page.root, body: page.body, sashes: page.sashes, overlay: deps.overlay, store: modes });
    resumeModules(this.modules, modes);
  }

  public receive(message: unknown): void {
    const at = this.deps.now();

    if (isGraphHostMessage(message)) this.route(message, at);
    else reportDropped(message);
  }

  public facts(): ProbeFacts {
    return probeFactsOf({ frames: this.frames, packages: this.packages, tasks: this.tasks });
  }

  /** The page became visible: the card clock catches up at once instead of at the next tick. */
  public clockShown(): void {
    this.clock.shown();
  }

  // eslint-disable-next-line complexity -- one flat case per host message type, kept exhaustive by switch-exhaustiveness-check.
  private route(message: GraphHostMessage, at: number): void {
    switch (message.type) {
      case 'state':
        this.routing.show(message.state, at);
        break;
      case 'showTasks':
        this.modules.leave();
        this.tasks.showTasks(message.taskIds, at);
        break;
      case 'showPackage':
        this.modules.leave();
        this.reveal.request(message.name);
        break;
      case 'edgeExplained':
      case 'edgeImports':
        this.packages.filtering.inspection.replied(message);
        break;
      case 'runs':
        this.runs(message, at);
        break;
      case 'atoms':
        this.tasks.layout.atoms.states(message.groups);
        break;
      case 'packageModules':
      case 'showModules':
        this.modules.receive(message, at);
        break;
      case 'moduleSites':
        // Nothing on the page shows module sites yet, so the answer is dropped.
        break;
    }
  }

  private runs(message: GraphRunsMessage, at: number): void {
    this.tasks.selection.runs(message.runs, message.owners ?? NO_OWNERS);
    this.packages.runs(message.runs);
    applyRunMarks(this.view.tasks, message);
    this.clock.runs(message.elapsed, at);
  }

  /** Re-layout and Retry act on the graph of the mode on screen; the package side never lays out under the modules canvas. */
  private relayout(): void {
    const isModuleMode = this.modules.isActive();
    const isTaskMode = this.tasks.isActive();

    if (isModuleMode) this.modules.relayout();
    else if (isTaskMode) void this.tasks.layout.relayout();
    else void this.packages.guard(async (): Promise<void> => this.packages.layouts.relayout());
  }
}

/** The graph page's controller; until the first valid host state nothing runs, so the page keeps its pre-state. */
export const createGraphController = (deps: GraphControllerDeps): GraphController => {
  const page = new GraphPageController(deps);
  const receive = (message: unknown): void => page.receive(message);
  const clockShown = (): void => page.clockShown();
  const controller: GraphController = { receive, clockShown, view: page.view, flow: page.flow, facts: page.facts() };

  return controller;
};
