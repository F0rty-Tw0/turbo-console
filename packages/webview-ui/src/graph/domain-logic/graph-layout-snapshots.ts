import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import type { FallbackCause, LayoutResult } from '../common/layout.type.ts';
import { withoutRoutes } from '../utils/elk-routes.util.ts';

const NO_ROUTES: Routes = {};

/** The drawn hash's layout per mode: its positions and routes, drags included, and the engine that made them. */
export class GraphLayoutSnapshots {
  private readonly positions = new Map<LayoutGrouping, Positions>();
  private readonly routes = new Map<LayoutGrouping, Routes>();
  private readonly engines = new Map<LayoutGrouping, LayoutEngine>();
  private readonly fallbackCauses = new Map<LayoutGrouping, FallbackCause>();

  public has(mode: LayoutGrouping): boolean {
    return this.positions.has(mode);
  }

  public positionsOf(mode: LayoutGrouping): Positions | undefined {
    return this.positions.get(mode);
  }

  /** The routes the mode's edges are drawn on; `{}` when it has none, so every edge is straight. */
  public routesOf(mode: LayoutGrouping): Routes {
    return this.routes.get(mode) ?? NO_ROUTES;
  }

  public engineOf(mode: LayoutGrouping): LayoutEngine | null {
    return this.engines.get(mode) ?? null;
  }

  /** Why the mode's layout fell back; `null` for an ELK or cached layout, or none. */
  public fallbackCauseOf(mode: LayoutGrouping): FallbackCause | null {
    return this.fallbackCauses.get(mode) ?? null;
  }

  /** The host's cached layout of `mode`; `null` positions, a cache miss, keep nothing, and `null` routes beside them keep `{}`. */
  public seed(mode: LayoutGrouping, positions: Positions | null, routes: Routes | null): void {
    if (positions === null) return;

    this.positions.set(mode, positions);
    this.routes.set(mode, routes ?? NO_ROUTES);
    this.engines.set(mode, 'cache');
    this.fallbackCauses.delete(mode);
  }

  public keep(mode: LayoutGrouping, result: LayoutResult): void {
    this.positions.set(mode, result.positions);
    this.routes.set(mode, result.routes);
    this.engines.set(mode, result.engine);

    if (result.fallbackCause === null) this.fallbackCauses.delete(mode);
    else this.fallbackCauses.set(mode, result.fallbackCause);
  }

  /**
   * A drag moves the positions, drops the routes of the `touched` edges, which are drawn straight from now on, and keeps
   * the engine, so a dragged fallback layout is still never cached.
   */
  public drag(mode: LayoutGrouping, positions: Positions, touched: string[]): void {
    const routes = withoutRoutes(this.routesOf(mode), touched);

    this.positions.set(mode, positions);
    this.routes.set(mode, routes);
  }

  public clear(): void {
    this.positions.clear();
    this.routes.clear();
    this.engines.clear();
    this.fallbackCauses.clear();
  }
}
