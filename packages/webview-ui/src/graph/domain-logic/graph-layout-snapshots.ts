import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { Positions } from '../../bridge/common/graph-state.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';

/** The drawn hash's layout per mode: its positions, drags included, and the engine that made them. */
export class GraphLayoutSnapshots {
  private readonly positions = new Map<LayoutGrouping, Positions>();
  private readonly engines = new Map<LayoutGrouping, LayoutEngine>();

  public has(mode: LayoutGrouping): boolean {
    return this.positions.has(mode);
  }

  public positionsOf(mode: LayoutGrouping): Positions | undefined {
    return this.positions.get(mode);
  }

  public engineOf(mode: LayoutGrouping): LayoutEngine | null {
    return this.engines.get(mode) ?? null;
  }

  /** The host's cached layout of `mode`; `null`, a cache miss, keeps nothing. */
  public seed(mode: LayoutGrouping, positions: Positions | null): void {
    if (positions === null) return;

    this.positions.set(mode, positions);
    this.engines.set(mode, 'cache');
  }

  public keep(mode: LayoutGrouping, result: LayoutResult): void {
    this.positions.set(mode, result.positions);
    this.engines.set(mode, result.engine);
  }

  /** A drag moves the positions and keeps the engine, so a dragged fallback layout is still never cached. */
  public drag(mode: LayoutGrouping, positions: Positions): void {
    this.positions.set(mode, positions);
  }

  public clear(): void {
    this.positions.clear();
    this.engines.clear();
  }
}
