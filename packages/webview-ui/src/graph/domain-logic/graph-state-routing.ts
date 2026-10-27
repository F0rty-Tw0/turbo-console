import type { GraphState } from '../../bridge/common/graph-state.type.ts';
import type { StateRoutingDeps } from '../common/state-routing.type.ts';

/**
 * Routes the host's states by mode: the package side shows them and draws the package graph; task mode reads every
 * graph state first, and a new package hash meanwhile waits as `pending`.
 */
export class GraphStateRouting {
  private readonly deps: StateRoutingDeps;
  /** A package graph state that arrived in task mode, shown when task mode exits. */
  private pending: GraphState | null = null;

  public constructor(deps: StateRoutingDeps) {
    this.deps = deps;
  }

  /** Task mode reads every graph state first; in task mode a new package hash is held, so the task canvas stays; any other state drops the one held. */
  public show(state: GraphState, at: number): void {
    const { tasks, packages } = this.deps;
    const isGraph = state.kind === 'graph';

    if (isGraph) tasks.received(state, at);

    const isTaskMode = tasks.isActive();
    const drawnHash = packages.drawnHash();
    const isHeld = isGraph && isTaskMode && state.hash !== drawnHash;

    if (isHeld) {
      this.pending = state;

      return;
    }

    this.pending = null;
    packages.show(state, at);
  }

  /** Leaving task mode shows the package state held meanwhile, timed from now, else draws the package graph again. */
  public exitTasks(): void {
    const { pending } = this;
    const { packages } = this.deps;

    this.pending = null;
    packages.keepModeFocus();

    if (pending !== null) packages.show(pending, this.deps.now());
    else packages.redraw();
  }
}
