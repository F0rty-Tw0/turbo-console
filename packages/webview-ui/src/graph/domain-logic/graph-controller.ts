import { GraphFiltering } from './graph-filtering.ts';
import { GraphFrames } from './graph-frames.ts';
import { GraphLayouts } from './graph-layouts.ts';
import { layoutScreenOf, showFailure, showStateMessage } from './graph-page-states.ts';
import type { GraphPackage, GraphReady, GraphState, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { DrawnGraph, GraphController, GraphControllerDeps, GraphView, GraphViewHandlers } from '../common/graph-page.type.ts';
import type { LayoutEngine, ProbeFacts } from '../common/graph-probe.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';
import { folderKeysOf } from '../utils/folder-group.util.ts';
import { isGraphHostMessage } from '../utils/graph-host-message.util.ts';
import { readGraphViewState } from '../utils/graph-view-state.util.ts';
import { openingStateOf } from '../utils/grouping-open.util.ts';
import { groupingOf } from '../utils/layout-plan.util.ts';
import { taskCountsDiffer } from '../utils/task-counts.util.ts';
import { restorePlanOf } from '../utils/view-restore.util.ts';

const BACKGROUND: InspectionInput = { kind: 'background' };

/** Shows the host's states; a graph state goes to the layouts, which draw it and post its layout back. */
class GraphPageController {
  public readonly view: GraphView;

  private readonly deps: GraphControllerDeps;
  private readonly frames: GraphFrames;
  private readonly filtering: GraphFiltering;
  private readonly layouts: GraphLayouts;
  private drawn: DrawnGraph | null = null;
  private opening: GraphViewState | null = null;
  private hasShownGraph = false;

  public constructor(deps: GraphControllerDeps) {
    const { bridge, page } = deps;
    const handlers: GraphViewHandlers = {
      onTapNode: (name: string): void => this.filtering.inspection.tapNode(name),
      onTapEdge: (source: string, target: string): void => this.filtering.inspection.tapEdge(source, target),
      onTapBackground: (): void => this.filtering.inspection.input(BACKGROUND),
      onTapFolder: (): void => undefined,
      onDoubleTapNode: (name: string): void => this.filtering.inspection.openDetailsOf(name),
      onDoubleTapFolder: (folder: string): void => this.filtering.folders.toggle(folder),
      onDragEnd: (positions: Positions): void => this.layouts.dragged(positions),
      onViewport: (): void => this.filtering.inspection.saveViewport(),
      onRender: (): void => {
        this.frames.mark();
        this.filtering.folders.rendered();
      }
    };

    this.deps = deps;
    this.frames = new GraphFrames(deps.now);
    this.view = deps.createView(page.container, handlers);
    this.filtering = new GraphFiltering({
      ...deps,
      view: this.view,
      drawn: (): DrawnGraph | null => this.drawn,
      onGrouping: (isGrouped: boolean): void => this.switchGrouping(isGrouped),
      isGrouped: (): boolean => this.layouts.drawnMode() === 'folders',
      canAct: (): boolean => this.layouts.mode() === 'folders' && this.layouts.drawnMode() === 'folders'
    });
    this.layouts = new GraphLayouts({
      ...deps,
      screen: layoutScreenOf(page),
      view: this.view,
      drawn: (): DrawnGraph | null => this.drawn,
      onDrawn: (saved: GraphViewState | null): void => this.afterDraw(saved),
      onPlaced: (): void => this.filtering.folders.redraw()
    });
    page.fit.addEventListener('click', (): void => this.view.fit());
    page.relayout.addEventListener('click', (): void => void this.guard(async (): Promise<void> => this.layouts.relayout()));
    page.retry.addEventListener('click', (): void => void this.guard(async (): Promise<void> => this.layouts.relayout()));
    page.reload.addEventListener('click', (): void => bridge.post({ type: 'reload' }));
  }

  public receive(message: unknown): void {
    const at = this.deps.now();

    if (!isGraphHostMessage(message)) return;

    if (message.type === 'state') this.show(message.state, at);
    else this.filtering.inspection.explained(message);
  }

  public facts(): ProbeFacts {
    const filteringFacts = this.filtering.facts();
    const facts: ProbeFacts = {
      firstFrameMs: (): number | null => this.frames.firstFrameMs(),
      layoutEngine: (): LayoutEngine | null => this.layouts.engine(),
      grouped: (): boolean => this.layouts.mode() === 'folders',
      ...filteringFacts
    };

    return facts;
  }

  private show(state: GraphState, at: number): void {
    if (state.kind === 'graph') {
      this.showGraph(state, at);

      return;
    }

    this.drawn = null;
    this.filtering.inspection.reset();
    showStateMessage(this.deps.page, state);
  }

  /** A re-post of the graph shown or in flight never resets the camera or the layout; it only refreshes task counts. */
  private showGraph(state: GraphReady, at: number): void {
    const shown = this.drawn;

    if (shown !== null && state.hash === shown.hash) {
      this.refresh(shown, state.packages);

      return;
    }

    const raw = this.deps.bridge.savedState();
    const read = readGraphViewState(raw);
    const folders = folderKeysOf(state.packages);
    const saved = openingStateOf(read, state.hash, folders, state.packages.length, this.hasShownGraph);

    this.opening = saved === read ? null : saved;
    this.hasShownGraph = true;
    this.drawn = drawnGraphOf(state);
    this.frames.start(at);
    this.filtering.inspection.reset();
    void this.guard(async (): Promise<void> => this.layouts.show(state, saved));
  }

  /** After a hash's first draw: filters, inspection and the saved camera or a fit. */
  private afterDraw(saved: GraphViewState | null): void {
    const drawn = this.drawn;

    if (drawn === null) return;

    const camera = saved === this.opening ? null : saved;
    const plan = restorePlanOf(camera, drawn.hash);

    this.frames.arm();

    const visible = this.filtering.restore(saved, drawn, this.frames.receivedAt());

    this.filtering.inspection.mount(saved);

    if (plan.kind === 'restore') this.view.setViewport(plan.zoom, plan.pan);
    else this.view.fit();

    this.filtering.inspection.restore(saved, visible);
  }

  /** A same-hash state: changed task counts replace the drawn ones, then the inspection follows. */
  private refresh(shown: DrawnGraph, packages: GraphPackage[]): void {
    const isChanged = taskCountsDiffer(shown.infos, packages);

    if (isChanged) this.drawn = { ...shown, infos: packages };

    this.filtering.inspection.refreshed(isChanged);
  }

  private switchGrouping(isGrouped: boolean): void {
    const mode = groupingOf(isGrouped);

    void this.guard(async (): Promise<void> => this.layouts.switchTo(mode));
  }

  /**
   * Runs a draw or layout step. A throw while the step's graph is still the one drawn replaces the graph with its
   * reason, and the next graph state, even the same one, draws afresh; a throw from a graph since replaced is dropped.
   */
  private async guard(step: () => unknown): Promise<void> {
    const hash = this.drawn?.hash;

    try {
      await step();
    } catch (error: unknown) {
      if (this.drawn?.hash !== hash) return;

      this.drawn = null;
      this.layouts.reset();
      this.filtering.inspection.reset();
      showFailure(this.deps.page, error);
    }
  }
}

/** The graph page's controller; until the first valid host state nothing runs, so the page keeps its pre-state. */
export const createGraphController = (deps: GraphControllerDeps): GraphController => {
  const page = new GraphPageController(deps);
  const receive = (message: unknown): void => page.receive(message);
  const controller: GraphController = { receive, view: page.view, facts: page.facts() };

  return controller;
};
