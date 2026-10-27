import { GraphFiltering } from './graph-filtering.ts';
import { GraphLayouts } from './graph-layouts.ts';
import { refreshedDrawn, restoreAfterDraw } from './graph-package-draw.ts';
import { layoutScreenOf, showFailure, showStateMessage } from './graph-page-states.ts';
import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FrameClock } from '../common/frame-clock.type.ts';
import type { LayoutScreen } from '../common/graph-layouts.type.ts';
import type { DrawnGraph, GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { PackageModes, PackageSideHooks } from '../common/graph-task.type.ts';
import { parkedScreenOf, parkedViewOf } from '../data-access/parked-view.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';
import { folderKeysOf } from '../utils/folder-group.util.ts';
import { openingStateOf } from '../utils/grouping-open.util.ts';
import { groupingOf } from '../utils/layout-plan.util.ts';

/**
 * The package graph: shows the host's states, hands a graph state to the layouts, which draw it and post its layout back.
 * It draws through a view parked while task mode owns the canvas, and its folder and key actions wait for package mode.
 * Leaving task mode from the Task mode toggle gives the toggle its focus back once the graph shows again.
 */
export class GraphPackageSide {
  public readonly filtering: GraphFiltering;
  public readonly layouts: GraphLayouts;

  private readonly deps: GraphControllerDeps;
  private readonly view: GraphView;
  private readonly frames: FrameClock;
  private readonly modes: PackageModes;
  private readonly onMessage: () => void;
  private drawn: DrawnGraph | null = null;
  private opening: GraphViewState | null = null;
  private isToggleFocusKept = false;

  public constructor(deps: GraphControllerDeps, screenView: GraphView, hooks: PackageSideHooks) {
    const { frames, modes } = hooks;
    const isPackageMode = (): boolean => modes.mode() === 'packages';
    const isParked = (): boolean => !isPackageMode();
    const view = parkedViewOf(screenView, isParked);
    const pageScreen = layoutScreenOf(deps.page);
    const parkedScreen = parkedScreenOf(pageScreen, isParked);
    const screen: LayoutScreen = {
      ...parkedScreen,
      showGraph: (isFallback: boolean): void => this.showScreenGraph(parkedScreen, isFallback)
    };
    const isGrouped = (): boolean => isPackageMode() && this.layouts.drawnMode() === 'folders';
    const canAct = (): boolean => isGrouped() && this.layouts.mode() === 'folders';

    this.deps = deps;
    this.view = view;
    this.frames = frames;
    this.modes = modes;
    this.onMessage = hooks.onMessage;
    this.filtering = new GraphFiltering({
      ...deps,
      ...hooks.tasks,
      saver: modes.packages,
      view,
      drawn: (): DrawnGraph | null => this.drawn,
      onGrouping: (grouped: boolean): void => this.switchGrouping(grouped),
      isPackageMode,
      isGrouped,
      canAct
    });
    this.layouts = new GraphLayouts({
      ...deps,
      screen,
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
    this.onMessage();
  }

  /** The hash of the package graph shown or being laid out; `null` while none is. */
  public drawnHash(): string | null {
    return this.drawn?.hash ?? null;
  }

  /** Task mode was left: the package graph drawn before is drawn again with the saved package view. */
  public redraw(): void {
    const saved = this.modes.current();

    void this.guard(async (): Promise<void> => this.layouts.redraw(saved));
  }

  /** Task mode is being left: a toggle with focus gets it back once the package graph shows, as the loading screen drops it. */
  public keepToggleFocus(): void {
    this.isToggleFocusKept = document.activeElement === this.deps.page.taskMode;
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
      this.onMessage();
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

    const read = this.modes.current();
    const folders = folderKeysOf(state.packages);
    const saved = openingStateOf(read, state.hash, folders, state.packages.length, this.modes.isGroupingSaved());

    this.opening = saved === read ? null : saved;
    this.drawn = drawnGraphOf(state);
    this.frames.start(at);
    this.filtering.inspection.reset();
    void this.guard(async (): Promise<void> => this.layouts.show(state, saved));
  }

  private showScreenGraph(screen: LayoutScreen, isFallback: boolean): void {
    const { activeElement, body } = document;
    const isFocusLost = activeElement === null || activeElement === body;
    const isRefocus = this.isToggleFocusKept && isFocusLost;

    screen.showGraph(isFallback);
    this.isToggleFocusKept = false;

    if (isRefocus) this.deps.page.taskMode.focus();
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
