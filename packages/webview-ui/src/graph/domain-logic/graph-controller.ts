import { GraphFiltering } from './graph-filtering.ts';
import { GraphFrames } from './graph-frames.ts';
import { showFailure, showGraphView, showMessage, showStateMessage } from './graph-page-states.ts';
import { postLayout } from './layout-post.ts';
import type { GraphReady, GraphState, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { DrawnGraph, GraphController, GraphControllerDeps, GraphView, GraphViewHandlers } from '../common/graph-page.type.ts';
import type { LayoutEngine, ProbeFacts } from '../common/graph-probe.type.ts';
import { LOADING_TEXT } from '../common/graph.const.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';
import { elkGraphOf } from '../utils/elk-graph.util.ts';
import { isGraphHostMessage } from '../utils/graph-host-message.util.ts';
import { readGraphViewState } from '../utils/graph-view-state.util.ts';
import { restorePlanOf } from '../utils/view-restore.util.ts';
import { visibleSelection } from '../utils/visible-selection.util.ts';

/** Shows the host's states; lays a graph out unless the host sent cached positions, and posts the layout back. */
class GraphPageController {
  public readonly view: GraphView;

  private readonly deps: GraphControllerDeps;
  private readonly frames: GraphFrames;
  private readonly filtering: GraphFiltering;
  private drawn: DrawnGraph | null = null;
  private engine: LayoutEngine | null = null;

  public constructor(deps: GraphControllerDeps) {
    const { bridge, page } = deps;
    const handlers: GraphViewHandlers = {
      onTapNode: (name: string): void => this.filtering.selection.tapNode(name),
      onTapBackground: (): void => this.filtering.selection.select(null),
      onDoubleTapNode: (): void => this.filtering.selection.openDetails(),
      onDragEnd: (positions: Positions): void => this.postDragged(positions),
      onViewport: (): void => this.filtering.selection.saveViewport(),
      onRender: (): void => this.frames.mark()
    };

    this.deps = deps;
    this.frames = new GraphFrames(deps.now);
    this.view = deps.createView(page.container, handlers);
    this.filtering = new GraphFiltering({ ...deps, view: this.view, drawn: (): DrawnGraph | null => this.drawn });
    page.fit.addEventListener('click', (): void => this.view.fit());
    page.relayout.addEventListener('click', (): void => void this.guard(async (): Promise<void> => this.relayout()));
    page.retry.addEventListener('click', (): void => void this.guard(async (): Promise<void> => this.relayout()));
    page.reload.addEventListener('click', (): void => bridge.post({ type: 'reload' }));
  }

  public receive(message: unknown): void {
    const at = this.deps.now();

    if (!isGraphHostMessage(message)) return;

    if (message.type !== 'state') return;

    this.show(message.state, at);
  }

  public facts(): ProbeFacts {
    const filteringFacts = this.filtering.facts();
    const facts: ProbeFacts = {
      selected: (): string | null => this.filtering.selection.current(),
      firstFrameMs: (): number | null => this.frames.firstFrameMs(),
      layoutEngine: (): LayoutEngine | null => this.engine,
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
    this.filtering.selection.reset();
    showStateMessage(this.deps.page, state);
  }

  /** A re-post of the graph shown or in flight does nothing, so it never resets the camera or the layout. */
  private showGraph(state: GraphReady, at: number): void {
    if (state.hash === this.drawn?.hash) return;

    const raw = this.deps.bridge.savedState();
    const saved = readGraphViewState(raw);

    this.drawn = drawnGraphOf(state);
    this.engine = null;
    this.frames.start(at);
    this.filtering.selection.reset();

    const { positions } = state;

    if (positions !== null) {
      void this.guard((): void => this.place(positions, 'cache', saved));

      return;
    }

    showMessage(this.deps.page, LOADING_TEXT, false);
    void this.guard(async (): Promise<void> => this.layOut(saved));
  }

  private async layOut(saved: GraphViewState | null): Promise<void> {
    const result = await this.currentLayout();

    if (result === null) return;

    this.place(result.positions, result.engine, saved);
    postLayout(this.deps.bridge, result);
  }

  /** Runs ELK for the current graph; `null` when the run went stale or the page moved on to another graph. */
  private async currentLayout(): Promise<LayoutResult | null> {
    const drawn = this.drawn;

    if (drawn === null) return null;

    const graph = elkGraphOf(drawn.packages, drawn.edges, this.deps.sizeOf);
    const result = await this.deps.runner.run(drawn.hash, graph);
    const isCurrent = result?.hash === this.drawn?.hash;

    return isCurrent ? result : null;
  }

  private place(positions: Positions, engine: LayoutEngine, saved: GraphViewState | null): void {
    const drawn = this.drawn;

    if (drawn === null) return;

    const plan = restorePlanOf(saved, drawn.hash, drawn.packages);

    showGraphView(this.deps.page, engine === 'fallback');
    this.view.setGraph(drawn.packages, drawn.edges, positions, this.deps.sizeOf);
    this.engine = engine;
    this.frames.arm();

    const visible = this.filtering.restore(saved, drawn, this.frames.receivedAt());

    if (plan.kind === 'restore') this.view.setViewport(plan.zoom, plan.pan);
    else this.view.fit();

    const selected = visibleSelection(plan.selected, visible);

    this.filtering.selection.select(selected);
  }

  /** Re-layout and Retry: a fresh run for the current graph, then a fit; a successful run hides the notice. */
  private async relayout(): Promise<void> {
    const result = await this.currentLayout();

    if (result === null) return;

    this.view.setPositions(result.positions);
    this.engine = result.engine;
    this.deps.page.notice.hidden = result.engine !== 'fallback';
    this.view.fit();
    postLayout(this.deps.bridge, result);
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
      this.engine = null;
      this.filtering.selection.reset();
      showFailure(this.deps.page, error);
    }
  }

  private postDragged(positions: Positions): void {
    const hash = this.drawn?.hash;
    const isCacheable = this.engine === 'elk' || this.engine === 'cache';

    if (hash === undefined || !isCacheable) return;

    this.deps.bridge.post({ type: 'positions', hash, positions });
  }
}

/** The graph page's controller; until the first valid host state nothing runs, so the page keeps its pre-state. */
export const createGraphController = (deps: GraphControllerDeps): GraphController => {
  const page = new GraphPageController(deps);
  const receive = (message: unknown): void => page.receive(message);
  const controller: GraphController = { receive, view: page.view, facts: page.facts() };

  return controller;
};
