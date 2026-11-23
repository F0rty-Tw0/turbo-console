import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';
import type { StateRoutingDeps } from '../common/state-routing.type.ts';

/**
 * Routes the host's states by mode: the package side shows them and draws the package graph; task and modules mode read
 * every graph state, and a new package hash meanwhile waits as `pending`.
 */
export class GraphStateRouting {
  private readonly deps: StateRoutingDeps;
  /** A package graph state that arrived in task or modules mode, shown when the page leaves to packages. */
  private pending: GraphState | null = null;

  public constructor(deps: StateRoutingDeps) {
    this.deps = deps;
  }

  /**
   * Task mode reads every graph state first; a single-package state also hides the mode group and turns task mode on.
   * In task or modules mode a new package hash is held, so their canvas stays; any other state drops the one held.
   * Modules mode then reads the state, after the hold, so a leave on "package gone" shows the held state once.
   */
  public show(state: GraphState, at: number): void {
    const { modules, packages } = this.deps;
    const isGraph = state.kind === 'graph';

    if (isGraph) this.receive(state, at);

    const isCovered = this.isCovered();
    const drawnHash = packages.drawnHash();
    const isHeld = isGraph && isCovered && state.hash !== drawnHash;

    this.pending = isHeld ? state : null;

    if (isGraph) modules.received(state);

    if (isHeld) return;

    packages.show(state, at);
  }

  /**
   * The page left task or modules mode for `mode`. To packages it shows the state held meanwhile, timed from now, else
   * draws the package graph again; to tasks, task mode enters and the state stays held; to modules nothing is drawn.
   */
  public exitTo(mode: GraphViewMode): void {
    switch (mode) {
      case 'packages':
        this.showPackages();
        break;
      case 'tasks':
        this.deps.tasks.enter(this.deps.now());
        break;
      case 'modules':
        break;
    }
  }

  private showPackages(): void {
    const { pending } = this;
    const { packages } = this.deps;

    this.pending = null;
    packages.keepModeFocus();

    if (pending !== null) packages.show(pending, this.deps.now());
    else packages.redraw();
  }

  /**
   * Task mode reads the state; the mode group is hidden exactly for a single-package state, which also turns task mode
   * on, never off, and not while modules mode owns the canvas.
   */
  private receive(state: GraphReady, at: number): void {
    const { tasks } = this.deps;

    tasks.received(state, at);
    this.deps.hideModes(state.singlePackage);

    const isCovered = this.isCovered();
    const isEntering = state.singlePackage && !isCovered;

    if (isEntering) tasks.enter(at);
  }

  /** Whether task or modules mode owns the canvas, which the package graph then waits under. */
  private isCovered(): boolean {
    const { tasks, modules } = this.deps;

    return tasks.isActive() || modules.isActive();
  }
}
