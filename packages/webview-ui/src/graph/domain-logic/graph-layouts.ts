import { postDragged } from './graph-layout-actions.ts';
import { GraphLayoutRuns } from './graph-layout-runs.ts';
import { GraphLayoutSnapshots } from './graph-layout-snapshots.ts';
import { postLayout } from './layout-post.ts';
import type { GraphPositionsMessage, LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { GraphReady, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphLayoutsDeps, LayoutNotice } from '../common/graph-layouts.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { modeGroupsOf } from '../utils/folder-group.util.ts';
import { arrivalOf, engineNoticeOf, progressNoticeOf, switchPlanOf } from '../utils/layout-plan.util.ts';

/**
 * The flat and the grouped layout of the drawn hash: a snapshot and an engine per mode, the checkbox's mode and the
 * mode on screen. A run carries its mode, so a late run of the other mode is only stored.
 */
export class GraphLayouts {
  private readonly deps: GraphLayoutsDeps;
  private readonly runs: GraphLayoutRuns;
  private readonly snapshots = new GraphLayoutSnapshots();
  private checked: LayoutGrouping = 'flat';
  private onScreen: LayoutGrouping = 'flat';
  private hasDrawn = false;
  private saved: GraphViewState | null = null;

  public constructor(deps: GraphLayoutsDeps) {
    this.deps = deps;
    this.runs = new GraphLayoutRuns(deps);
  }

  /** The checkbox's mode. */
  public mode(): LayoutGrouping {
    return this.checked;
  }

  /** The mode on screen; differs from `mode()` while a switch waits for its first layout. */
  public drawnMode(): LayoutGrouping {
    return this.onScreen;
  }

  /** The engine of the layout on screen. */
  public engine(): LayoutEngine | null {
    return this.snapshots.engineOf(this.onScreen);
  }

  /** A hash not on screen: the saved mode draws from its cache at once, or lays out behind Loading. */
  public async show(state: GraphReady, saved: GraphViewState | null): Promise<void> {
    const mode: LayoutGrouping = saved?.grouped === true ? 'folders' : 'flat';

    this.reset();
    this.snapshots.seed('flat', state.positions);
    this.snapshots.seed('folders', state.folderPositions);
    this.checked = mode;
    this.onScreen = mode;
    this.saved = saved;

    const isCached = this.snapshots.has(mode);

    if (isCached) {
      this.place(mode);

      return;
    }

    this.deps.screen.showLoading();
    await this.layOut(mode);
  }

  /** Places the mode's snapshot, or shows its progress text and lays it out, reusing a run of that mode in flight. */
  public async switchTo(next: LayoutGrouping): Promise<void> {
    if (!this.hasDrawn) return;

    const plan = switchPlanOf(next, this.onScreen, this.snapshots.has(next));

    this.checked = next;

    if (plan === 'keep') {
      this.showNotice(this.noticeOf(next));

      return;
    }

    if (plan === 'place') {
      this.place(next);

      return;
    }

    this.showNotice(progressNoticeOf(next));

    const isRunning = this.runs.isRunning(next);

    if (isRunning) return;

    await this.layOut(next);
  }

  /** Re-layout and Retry: a fresh run of the checkbox's mode; a switch still waiting stays waiting until it lands. */
  public async relayout(): Promise<void> {
    await this.layOut(this.checked);
  }

  /** Keeps a drag in the snapshot on screen and posts it for that mode's cache unless its layout fell back. */
  public dragged(positions: Positions): void {
    const drawn = this.deps.drawn();

    if (drawn === null) return;

    const message: GraphPositionsMessage = { type: 'positions', hash: drawn.hash, positions, grouping: this.onScreen };

    this.snapshots.drag(this.onScreen, positions);
    postDragged(this.deps.bridge, this.engine(), message);
  }

  public reset(): void {
    this.snapshots.clear();
    this.runs.forget();
    this.hasDrawn = false;
  }

  private async layOut(mode: LayoutGrouping): Promise<void> {
    const result = await this.runs.run(mode);

    if (result !== null) this.arrive(result, mode);
  }

  private arrive(result: LayoutResult, runMode: LayoutGrouping): void {
    const drawnHash = this.deps.drawn()?.hash ?? null;
    const arrival = arrivalOf(result.hash, drawnHash, runMode, this.checked);

    if (arrival === 'ignore') return;

    this.snapshots.keep(runMode, result);
    postLayout(this.deps.bridge, result, runMode);

    if (arrival === 'place') this.place(runMode);
  }

  private place(mode: LayoutGrouping): void {
    const drawn = this.deps.drawn();
    const positions = this.snapshots.positionsOf(mode);

    if (drawn === null || positions === undefined) return;

    if (!this.hasDrawn) {
      this.draw(drawn, positions, mode);

      return;
    }

    const { view } = this.deps;
    const groups = modeGroupsOf(drawn.infos, mode);

    if (mode !== this.onScreen) view.setGrouping(groups);

    view.setPositions(positions);
    this.deps.screen.showNotice(this.noticeOf(mode));
    this.onScreen = mode;
    this.deps.onPlaced(mode);
    view.fit();
  }

  /** The hash's first draw; the controller then restores filters, inspection and camera. */
  private draw(drawn: DrawnGraph, positions: Positions, mode: LayoutGrouping): void {
    const { view } = this.deps;
    const groups = modeGroupsOf(drawn.infos, mode);
    const isFallback = this.snapshots.engineOf(mode) === 'fallback';

    this.deps.screen.showGraph(isFallback);
    view.setGraph(drawn.packages, drawn.edges, positions, this.deps.sizeOf);

    if (groups !== null) view.setGrouping(groups);

    this.hasDrawn = true;
    this.deps.onDrawn(this.saved);
    this.deps.onPlaced(mode);
  }

  /** The notice line shows or hides and moves the canvas; Cytoscape keeps its old offset for a debounce unless told. */
  private showNotice(notice: LayoutNotice): void {
    this.deps.screen.showNotice(notice);
    this.deps.view.resize();
  }

  private noticeOf(mode: LayoutGrouping): LayoutNotice {
    const engine = this.snapshots.engineOf(mode);

    return engineNoticeOf(engine);
  }
}
