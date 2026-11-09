import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import { TASK_LAYOUT_MEMORY } from '../common/graph-task.const.ts';
import type { TaskLayoutDeps, TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { withoutRoutes } from '../utils/elk-routes.util.ts';
import { elkTaskGraphOf } from '../utils/elk-task-graph.util.ts';
import { engineNoticeOf } from '../utils/layout-plan.util.ts';
import { titleWidthsOf } from '../utils/task-title-width.util.ts';

/**
 * Whether a layout for `key` with no camera saved for it opens: not when the saved camera is a regroup's pending choice
 * (no layout key yet, saved fitted), which keeps the true fit; a camera saved fitted for another key is not one for this key.
 */
const isOpenFor = (saved: TaskViewState | null, key: string): boolean => {
  const isPendingFit = saved?.layoutKey === '' && saved.fitted;
  const isOtherKey = saved?.layoutKey !== key;
  const isOpen = isOtherKey && !isPendingFit;

  return isOpen;
};

/**
 * The task graph's layout: the key asked for, the layout on screen, and the last `TASK_LAYOUT_MEMORY` layouts shown by
 * key in page memory, a drag included. Runs share the package runner, latest wins; a task layout never posts `positions`
 * or `layoutDone`, only `shownUmbrellas` through `atoms`. A layout that throws while still asked for empties the canvas and goes to `onFailure`;
 * package titles are measured inside that guard, so a text sizer that throws fails the layout too.
 */
export class GraphTaskLayout {
  /** The Atomizer groups drawn as umbrellas: their counts, and the shown ones the host loads. */
  public readonly atoms: GraphAtomGroups;

  private readonly deps: TaskLayoutDeps;
  private readonly memory = new Map<string, LayoutResult>();
  private wanted: TaskLayoutRequest | null = null;
  private placed: LayoutResult | null = null;

  public constructor(deps: TaskLayoutDeps) {
    this.deps = deps;
    this.atoms = new GraphAtomGroups(deps);
  }

  /** The key of the layout asked for last, on screen or in flight. */
  public key(): string | null {
    return this.wanted?.key ?? null;
  }

  /** The key of the layout on screen while it is the one asked for; none while a newer layout is in flight. */
  public settledKey(): string | null {
    const placedKey = this.placed?.hash ?? null;
    const isInFlight = placedKey !== this.key();
    const settledKey = isInFlight ? null : placedKey;

    return settledKey;
  }

  public engine(): LayoutEngine | null {
    return this.placed?.engine ?? null;
  }

  /** Places the key's layout from memory at once, or lays it out; the saved camera returns only for the key it was saved with. */
  public async show(request: TaskLayoutRequest): Promise<void> {
    this.wanted = request;
    await this.guard(request, async (): Promise<void> => this.placeOrLayOut(request));
  }

  /** Re-layout and Retry: a fresh run of the key asked for, then a fit. */
  public async relayout(): Promise<void> {
    const request = this.wanted;

    if (request !== null) await this.guard(request, async (): Promise<void> => this.layOut(request, false));
  }

  /** Stops the flow, empties the task canvas and forgets the key asked for, so a run still in flight lands on nothing. */
  public clear(): void {
    this.wanted = null;
    this.placed = null;
    this.atoms.clear();
    this.deps.flow.stop();
    this.deps.view.tasks.clear();
  }

  /** Keeps the dragged centres as the layout of the key on screen and straightens the `touched` edges, in memory too. */
  public dragged(touched: string[]): void {
    const { placed } = this;

    if (placed === null) return;

    const positions = this.deps.view.tasks.positions();
    const routes = withoutRoutes(placed.routes, touched);
    const moved: LayoutResult = { ...placed, positions, routes };

    this.placed = moved;
    this.deps.view.tasks.setRoutes(routes);
    this.atoms.rebased(moved);
    this.remember(moved);
  }

  /** A throw while `request` is still asked for empties the canvas and is reported; one from a request since replaced is dropped. */
  private async guard(request: TaskLayoutRequest, step: () => Promise<void>): Promise<void> {
    try {
      await step();
    } catch (error: unknown) {
      if (this.wanted !== request) return;

      this.clear();
      this.deps.onFailure(error);
    }
  }

  private async placeOrLayOut(request: TaskLayoutRequest): Promise<void> {
    const kept = this.memory.get(request.key);

    if (kept === undefined) {
      await this.layOut(request, true);

      return;
    }

    const titleWidths = titleWidthsOf(request, this.deps.textSizeOf, this.deps.boxTitleSizeOf, this.deps.rootLabel());

    this.remember(kept);
    this.place(request, kept, titleWidths, true);
  }

  /** Keeps `result` as the layout shown last, forgetting the one shown least recently past `TASK_LAYOUT_MEMORY`. */
  private remember(result: LayoutResult): void {
    this.memory.delete(result.hash);
    this.memory.set(result.hash, result);

    const [oldest] = this.memory.keys();
    const isFull = this.memory.size > TASK_LAYOUT_MEMORY;

    if (isFull && oldest !== undefined) this.memory.delete(oldest);
  }

  private async layOut(request: TaskLayoutRequest, canRestore: boolean): Promise<void> {
    const titleWidths = titleWidthsOf(request, this.deps.textSizeOf, this.deps.boxTitleSizeOf, this.deps.rootLabel());
    const input = { ...request, titleWidths };
    const graph = elkTaskGraphOf(input, this.deps.sizeOf);
    const result = await this.deps.runner.run(request.key, graph);
    const wantedKey = this.key();

    if (result === null) return;

    const isSuperseded = result.hash !== wantedKey;

    if (isSuperseded) return;

    this.remember(result);
    this.place(request, result, titleWidths, canRestore);
  }

  /**
   * Stops the flow, draws the layout, restores the saved camera when its key is this one, else opens (a first placement
   * with no camera saved for the key) or fits (Re-layout, a regroup's pending choice), arms the frame clock, then hands
   * the drawn highlight back to the flow. `titleWidths` are the ones its layout was measured with.
   */
  private place(request: TaskLayoutRequest, result: LayoutResult, titleWidths: Map<string, number>, canRestore: boolean): void {
    const { view, screen, frames, sizeOf, flow } = this.deps;
    const saved = this.deps.saved();
    const isSavedCamera = canRestore && saved?.layoutKey === request.key && !saved.fitted;
    const isOpenKey = isOpenFor(saved, request.key);
    const isOpen = canRestore && isOpenKey;

    flow.stop();
    view.tasks.show({
      tasks: request.tasks,
      positions: result.positions,
      routes: result.routes,
      boxFrames: result.boxFrames,
      sizeOf,
      sizes: request.sizes,
      labels: this.atoms.labels(),
      titleWidths,
      rootLabel: this.deps.rootLabel(),
      naming: request.naming
    });
    this.placed = result;
    this.atoms.placed(request.shown, result, request.sizes, request.tasks);
    screen.showNotice(engineNoticeOf(result.engine));

    if (isSavedCamera) view.setViewport(saved.zoom, saved.pan);
    else if (isOpen) view.open();
    else view.fit();

    frames.arm();
    this.deps.onPlaced();
    this.deps.onDrawn();
  }
}
