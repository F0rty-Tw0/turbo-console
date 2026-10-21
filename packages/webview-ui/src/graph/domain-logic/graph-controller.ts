import { showGraphView, showMessage, showStateMessage } from './graph-page-states.ts';
import { GraphSelection } from './graph-selection.ts';
import type { GraphReady, GraphState, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { DrawnGraph, GraphController, GraphControllerDeps, GraphView, GraphViewHandlers } from '../common/graph-page.type.ts';
import type { LayoutEngine, ProbeFacts } from '../common/graph-probe.type.ts';
import { LOADING_TEXT } from '../common/graph.const.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { drawableEdges } from '../utils/closure.util.ts';
import { elkGraphOf } from '../utils/elk-graph.util.ts';
import { isGraphHostMessage } from '../utils/graph-host-message.util.ts';
import { readGraphViewState } from '../utils/graph-view-state.util.ts';
import { restorePlanOf } from '../utils/view-restore.util.ts';

/** Shows the host's states; lays a graph out unless the host sent cached positions, and posts the layout back. */
class GraphPageController {
  public readonly view: GraphView;

  private readonly deps: GraphControllerDeps;
  private readonly selection: GraphSelection;
  private drawn: DrawnGraph | null = null;
  private engine: LayoutEngine | null = null;
  private graphAt = 0;
  private firstFrame: number | null = null;
  private isFramePending = false;

  public constructor(deps: GraphControllerDeps) {
    const { bridge, page, saver } = deps;
    const handlers: GraphViewHandlers = {
      onTapNode: (name: string): void => this.selection.tapNode(name),
      onTapBackground: (): void => this.selection.select(null),
      onDoubleTapNode: (): void => this.selection.openDetails(),
      onDragEnd: (positions: Positions): void => this.postDragged(positions),
      onViewport: (): void => this.selection.saveViewport(),
      onRender: (): void => this.markFrame()
    };

    this.deps = deps;
    this.view = deps.createView(page.container, handlers);
    this.selection = new GraphSelection({ bridge, page, view: this.view, saver, drawn: (): DrawnGraph | null => this.drawn });
    page.fit.addEventListener('click', (): void => this.view.fit());
    page.relayout.addEventListener('click', (): void => void this.relayout());
    page.retry.addEventListener('click', (): void => void this.relayout());
    page.reload.addEventListener('click', (): void => bridge.post({ type: 'reload' }));
  }

  public receive(message: unknown): void {
    const at = this.deps.now();

    if (!isGraphHostMessage(message)) return;

    this.show(message.state, at);
  }

  public facts(): ProbeFacts {
    const facts: ProbeFacts = {
      selected: (): string | null => this.selection.current(),
      firstFrameMs: (): number | null => this.firstFrame,
      layoutEngine: (): LayoutEngine | null => this.engine
    };

    return facts;
  }

  private show(state: GraphState, at: number): void {
    if (state.kind === 'graph') {
      this.showGraph(state, at);

      return;
    }

    this.drawn = null;
    this.selection.reset();
    showStateMessage(this.deps.page, state);
  }

  /** A re-post of the graph shown or in flight does nothing, so it never resets the camera or the layout. */
  private showGraph(state: GraphReady, at: number): void {
    if (state.hash === this.drawn?.hash) return;

    const raw = this.deps.bridge.savedState();
    const saved = readGraphViewState(raw);
    const edges = drawableEdges(state.packages, state.edges);

    this.drawn = { hash: state.hash, packages: state.packages, edges };
    this.engine = null;
    this.graphAt = at;
    this.firstFrame = null;
    this.isFramePending = false;
    this.selection.reset();

    if (state.positions !== null) {
      this.place(state.positions, 'cache', saved);

      return;
    }

    showMessage(this.deps.page, LOADING_TEXT, false);
    void this.layOut(saved);
  }

  private async layOut(saved: GraphViewState | null): Promise<void> {
    const result = await this.currentLayout();

    if (result === null) return;

    this.place(result.positions, result.engine, saved);
    this.postLayout(result);
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
    this.isFramePending = true;

    if (plan.kind === 'restore') this.view.setViewport(plan.zoom, plan.pan);
    else this.view.fit();

    this.selection.select(plan.selected);
  }

  /** Re-layout and Retry: a fresh run for the current graph, then a fit; a successful run hides the notice. */
  private async relayout(): Promise<void> {
    const result = await this.currentLayout();

    if (result === null) return;

    this.view.setPositions(result.positions);
    this.engine = result.engine;
    this.deps.page.notice.hidden = result.engine !== 'fallback';
    this.view.fit();
    this.postLayout(result);
  }

  /** Only ELK positions go to the host cache; a fallback layout is never cached. */
  private postLayout(result: LayoutResult): void {
    const { bridge } = this.deps;

    if (result.engine === 'elk') bridge.post({ type: 'positions', hash: result.hash, positions: result.positions });

    bridge.post({ type: 'layoutDone', ms: result.ms, engine: result.engine });
  }

  private postDragged(positions: Positions): void {
    const hash = this.drawn?.hash;
    const isCacheable = this.engine === 'elk' || this.engine === 'cache';

    if (hash === undefined || !isCacheable) return;

    this.deps.bridge.post({ type: 'positions', hash, positions });
  }

  private markFrame(): void {
    if (!this.isFramePending) return;

    this.isFramePending = false;
    this.firstFrame = this.deps.now() - this.graphAt;
  }
}

/** The graph page's controller; until the first valid host state nothing runs, so the page keeps its pre-state. */
export const createGraphController = (deps: GraphControllerDeps): GraphController => {
  const page = new GraphPageController(deps);
  const receive = (message: unknown): void => page.receive(message);
  const controller: GraphController = { receive, view: page.view, facts: page.facts() };

  return controller;
};
