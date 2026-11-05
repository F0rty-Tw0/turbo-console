import { GraphFiltering } from './graph-filtering.ts';
import { GraphLayouts } from './graph-layouts.ts';
import { refreshedDrawn, relabel, restoreAfterDraw } from './graph-package-draw.ts';
import { GraphPackageRuns } from './graph-package-runs.ts';
import { layoutScreenOf, showFailure, showStateMessage } from './graph-page-states.ts';
import { PackageModeFocus } from './package-mode-focus.ts';
import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FrameClock } from '../common/frame-clock.type.ts';
import type { DrawnGraph, GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { PackageModes, PackageSideHooks } from '../common/graph-task.type.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { parkedScreenOf, parkedViewOf } from '../data-access/parked-view.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';
import { folderKeysOf } from '../utils/folder-group.util.ts';
import { openingStateOf } from '../utils/grouping-open.util.ts';
import { groupingOf } from '../utils/layout-plan.util.ts';

/**
 * The package graph: shows the host's states, hands a graph state to the layouts, which draw it and post its layout back.
 * It draws through a view parked while task mode owns the canvas, and its folder and key actions wait for package mode.
 * Leaving task mode from a mode button gives Packages the focus once the graph shows again.
 */
export class GraphPackageSide {
  public readonly filtering: GraphFiltering;
  public readonly layouts: GraphLayouts;

  private readonly deps: GraphControllerDeps;
  private readonly view: GraphView;
  private readonly frames: FrameClock;
  private readonly modes: PackageModes;
  private readonly modeFocus: PackageModeFocus;
  private readonly runMarks: GraphPackageRuns;
  private readonly onMessage: () => void;
  private drawn: DrawnGraph | null = null;
  private opening: GraphViewState | null = null;

  public constructor(deps: GraphControllerDeps, screenView: GraphView, hooks: PackageSideHooks) {
    const { frames, modes } = hooks;
    const isPackageMode = (): boolean => modes.mode() === 'packages';
    const isParked = (): boolean => !isPackageMode();
    const view = parkedViewOf(screenView, isParked);
    const pageScreen = layoutScreenOf(deps.page);
    const parkedScreen = parkedScreenOf(pageScreen, isParked);
    const modeFocus = new PackageModeFocus(deps.page);
    const screen = modeFocus.screenOf(parkedScreen);
    const isGrouped = (): boolean => isPackageMode() && this.layouts.drawnMode() === 'folders';
    const canAct = (): boolean => isGrouped() && this.layouts.mode() === 'folders';
    const canActOnPackage = (): boolean => isPackageMode() && this.layouts.mode() === this.layouts.drawnMode();
    const runMarks = new GraphPackageRuns(view);
    const onPlaced = (): void => {
      this.filtering.placed();
      runMarks.mark();
      hooks.onPlaced();
    };

    this.deps = deps;
    this.view = view;
    this.frames = frames;
    this.modes = modes;
    this.modeFocus = modeFocus;
    this.runMarks = runMarks;
    this.onMessage = hooks.onMessage;
    this.filtering = new GraphFiltering({
      ...deps,
      ...hooks.tasks,
      saver: modes.packages,
      view,
      drawn: (): DrawnGraph | null => this.drawn,
      onGrouping: (grouped: boolean): void => this.switchGrouping(grouped),
      onScope: (shown: boolean): void => deps.bridge.post({ type: 'setViewToggle', toggle: 'scope', shown }),
      isPackageMode,
      isGrouped,
      canAct,
      canActOnPackage,
      onLocation: hooks.onLocation
    });
    this.layouts = new GraphLayouts({
      ...deps,
      screen,
      view,
      drawn: (): DrawnGraph | null => this.drawn,
      onDrawn: (saved: GraphViewState | null): void => this.afterDraw(saved),
      onPlaced,
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

  /** The latest host run states; drawn on the packages while package mode shows (spec D13). */
  public runs(runs: TaskRuns): void {
    this.runMarks.runs(runs);
  }

  /** The hash of the package graph shown or being laid out; `null` while none is. */
  public drawnHash(): string | null {
    return this.drawn?.hash ?? null;
  }

  /** The package graph shown or being laid out; `null` while none is. */
  public drawnGraph(): DrawnGraph | null {
    return this.drawn;
  }

  /**
   * Task mode was left: the package graph drawn before is drawn again with the saved package view. The Group box takes the
   * saved grouping first, so a save the redraw's grouping off makes never writes the grouping task mode replaced.
   */
  public redraw(): void {
    const saved = this.modes.current();

    if (saved !== null) this.filtering.controls.syncGrouping(saved.grouped);
    void this.guard(async (): Promise<void> => this.layouts.redraw(saved));
  }

  /** Task mode is being left: a mode button with focus hands it to `modeFocusOf` once the package graph shows, as the loading screen drops it. */
  public keepModeFocus(): void {
    this.modeFocus.keep();
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

  /**
   * A re-post of the graph shown or in flight never resets the camera or the layout: it refreshes the task counts,
   * repaints the labels only when `scopeShown` rebuilt them, then the inspection follows.
   */
  private showGraph(state: GraphReady, at: number): void {
    this.runMarks.listed(state.tasks);

    const shown = this.drawn;

    if (shown !== null && state.hash === shown.hash) {
      const refreshed = refreshedDrawn(shown, state);
      const isChanged = refreshed !== shown;
      const isRelabelled = refreshed.labels !== shown.labels;

      this.drawn = refreshed;

      if (isRelabelled) relabel({ view: this.view, controls: this.filtering.controls }, refreshed);
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

  private afterDraw(saved: GraphViewState | null): void {
    const parts = { drawn: this.drawn, opening: this.opening, frames: this.frames, filtering: this.filtering, view: this.view };

    restoreAfterDraw(parts, saved);
  }

  private switchGrouping(isGrouped: boolean): void {
    const mode = groupingOf(isGrouped);

    void this.guard(async (): Promise<void> => this.layouts.switchTo(mode));
  }
}
