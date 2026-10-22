import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { GraphLayoutsDeps } from '../common/graph-layouts.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { layoutGraphOf } from '../utils/elk-graph.util.ts';

/**
 * The layout runs of the drawn hash and the mode of the latest one in flight. A run carries a ticket, so a run dropped
 * by the runner's latest-wins never clears the mode of the run that replaced it.
 */
export class GraphLayoutRuns {
  private readonly deps: GraphLayoutsDeps;
  private running: LayoutGrouping | null = null;
  private ticket = 0;

  public constructor(deps: GraphLayoutsDeps) {
    this.deps = deps;
  }

  /** The latest run is of `mode` and still in flight. */
  public isRunning(mode: LayoutGrouping): boolean {
    return this.running === mode;
  }

  /** Forgets the run in flight, so a new hash's switch starts its own run instead of waiting on the old hash's. */
  public forget(): void {
    this.running = null;
  }

  /** Lays the drawn graph out in `mode`; `null` when nothing is drawn or a newer run dropped this one. */
  public async run(mode: LayoutGrouping): Promise<LayoutResult | null> {
    const drawn = this.deps.drawn();

    if (drawn === null) return null;

    const graph = layoutGraphOf(drawn, mode, this.deps.sizeOf);

    this.ticket += 1;

    const ticket = this.ticket;

    this.running = mode;

    const result = await this.deps.runner.run(drawn.hash, graph);

    if (ticket === this.ticket) this.running = null;

    return result;
  }
}
