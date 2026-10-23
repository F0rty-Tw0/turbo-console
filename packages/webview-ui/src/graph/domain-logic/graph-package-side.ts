import { GraphFiltering } from './graph-filtering.ts';
import { GraphLayouts } from './graph-layouts.ts';
import { refreshedDrawn, restoreAfterDraw } from './graph-package-draw.ts';
import { layoutScreenOf, showFailure, showStateMessage } from './graph-page-states.ts';
import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FrameClock } from '../common/frame-clock.type.ts';
import type { DrawnGraph, GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';
import { folderKeysOf } from '../utils/folder-group.util.ts';
import { readGraphViewState } from '../utils/graph-view-state.util.ts';
import { openingStateOf } from '../utils/grouping-open.util.ts';
import { groupingOf } from '../utils/layout-plan.util.ts';

/** The package graph: shows the host's states, hands a graph state to the layouts, which draw it and post its layout back. */
export class GraphPackageSide {
  public readonly filtering: GraphFiltering;
  public readonly layouts: GraphLayouts;

  private readonly deps: GraphControllerDeps;
  private readonly view: GraphView;
  private readonly frames: FrameClock;
  private drawn: DrawnGraph | null = null;
  private opening: GraphViewState | null = null;
  private hasShownGraph = false;

  public constructor(deps: GraphControllerDeps, view: GraphView, frames: FrameClock) {
    this.deps = deps;
    this.view = view;
    this.frames = frames;
    this.filtering = new GraphFiltering({
      ...deps,
      view,
      drawn: (): DrawnGraph | null => this.drawn,
      onGrouping: (isGrouped: boolean): void => this.switchGrouping(isGrouped),
      isGrouped: (): boolean => this.layouts.drawnMode() === 'folders',
      canAct: (): boolean => this.layouts.mode() === 'folders' && this.layouts.drawnMode() === 'folders'
    });
    this.layouts = new GraphLayouts({
      ...deps,
      screen: layoutScreenOf(deps.page),
      view,
      drawn: (): DrawnGraph | null => this.drawn,
      onDrawn: (saved: GraphViewState | null): void => this.afterDraw(saved),
      onPlaced: (): void => this.filtering.placed(),
      onGroupingOff: (): void => this.filtering.groupingOff()
    });
  }

  public show(state: GraphState, at: number): void {
    if (state.kind === 'graph') {
      this.showGraph(state, at);

      return;
    }

    this.drawn = null;
    this.filtering.inspection.reset();
    showStateMessage(this.deps.page, state);
  }

  /**
   * Runs a draw or layout step. A throw while the step's graph is still the one drawn replaces the graph with its
   * reason, and the next graph state, even the same one, draws afresh; a throw from a graph since replaced is dropped.
   */
  public async guard(step: () => unknown): Promise<void> {
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

  /** A re-post of the graph shown or in flight never resets the camera or the layout; it only refreshes task counts, then the inspection follows. */
  private showGraph(state: GraphReady, at: number): void {
    const shown = this.drawn;

    if (shown !== null && state.hash === shown.hash) {
      const refreshed = refreshedDrawn(shown, state.packages);
      const isChanged = refreshed !== shown;

      this.drawn = refreshed;
      this.filtering.inspection.refreshed(isChanged);

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

  private afterDraw(saved: GraphViewState | null): void {
    const parts = { drawn: this.drawn, opening: this.opening, frames: this.frames, filtering: this.filtering, view: this.view };

    restoreAfterDraw(parts, saved);
  }

  private switchGrouping(isGrouped: boolean): void {
    const mode = groupingOf(isGrouped);

    void this.guard(async (): Promise<void> => this.layouts.switchTo(mode));
  }
}
