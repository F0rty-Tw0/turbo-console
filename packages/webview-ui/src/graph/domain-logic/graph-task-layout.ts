import type { LayoutEngine } from '../common/graph-probe.type.ts';
import { TASK_LAYOUT_MEMORY } from '../common/graph-task.const.ts';
import type { TaskLayoutDeps, TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { elkTaskGraphOf } from '../utils/elk-task-graph.util.ts';
import { engineNoticeOf } from '../utils/layout-plan.util.ts';

/**
 * The task graph's layout: the key asked for, the layout on screen, and the last `TASK_LAYOUT_MEMORY` layouts shown by
 * key in page memory, a drag included. Runs share the package runner, latest wins; a task layout never posts `positions`
 * or `layoutDone`. A layout that throws while still asked for empties the canvas and goes to `onFailure`.
 */
export class GraphTaskLayout {
  private readonly deps: TaskLayoutDeps;
  private readonly memory = new Map<string, LayoutResult>();
  private wanted: TaskLayoutRequest | null = null;
  private placed: LayoutResult | null = null;

  public constructor(deps: TaskLayoutDeps) {
    this.deps = deps;
  }

  /** The key of the layout asked for last, on screen or in flight. */
  public key(): string | null {
    return this.wanted?.key ?? null;
  }

  /** The key of the layout on screen. */
  public placedKey(): string | null {
    return this.placed?.hash ?? null;
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
    this.deps.flow.stop();
    this.deps.view.tasks.clear();
  }

  /** Keeps the dragged centres as the layout of the key on screen. */
  public dragged(): void {
    const { placed } = this;

    if (placed === null) return;

    const positions = this.deps.view.tasks.positions();
    const moved: LayoutResult = { ...placed, positions };

    this.placed = moved;
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

    this.remember(kept);
    this.place(request, kept, true);
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
    const graph = elkTaskGraphOf(request.tasks, request.shown, this.deps.sizeOf);
    const result = await this.deps.runner.run(request.key, graph);
    const wantedKey = this.key();

    if (result === null) return;

    const isSuperseded = result.hash !== wantedKey;

    if (isSuperseded) return;

    this.remember(result);
    this.place(request, result, canRestore);
  }

  /** Stops the flow, draws the layout, restores the saved camera when its key is this one (else fits), then arms the frame clock. */
  private place(request: TaskLayoutRequest, result: LayoutResult, canRestore: boolean): void {
    const { view, screen, frames, sizeOf, flow } = this.deps;
    const saved = this.deps.saved();
    const isSavedCamera = canRestore && saved?.layoutKey === request.key;

    flow.stop();
    view.tasks.show({ tasks: request.tasks, positions: result.positions, sizeOf });
    this.placed = result;
    screen.showNotice(engineNoticeOf(result.engine));

    if (isSavedCamera) view.setViewport(saved.zoom, saved.pan);
    else view.fit();

    frames.arm();
    this.deps.onPlaced();
  }
}
