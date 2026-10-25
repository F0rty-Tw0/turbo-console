import type { GraphState } from '@turbo-console/webview-ui';

import { Coalescer } from './coalescer.ts';
import type { SharedAtoms } from '../../tree/common/atom-load.type.ts';
import { RUNS_COALESCE_MS } from '../common/graph.const.ts';
import type { GraphPorts, TaskFeedGate } from '../common/graph.type.ts';
import { atomsMessageOf } from '../utils/graph-atoms-message.util.ts';

type AtomFeedDeps = {
  readonly root: string;
  readonly atoms: Pick<SharedAtoms, 'onDidChange' | 'view'>;
  readonly ports: Pick<GraphPorts, 'post'>;
  readonly gate: Pick<TaskFeedGate, 'canPost' | 'state'>;
};

/**
 * The `atoms` messages of one graph panel: the counts and file outcomes of its root's Atomizer groups, coalesced so a burst
 * of load changes is one post. `flush` posts them for a state just posted; nothing is posted for a state without groups.
 */
export class GraphAtomFeed {
  private readonly deps: AtomFeedDeps;
  private unsubscribe: (() => void) | null = null;
  private readonly coalescer: Coalescer;

  public constructor(deps: AtomFeedDeps) {
    this.deps = deps;
    this.coalescer = new Coalescer(RUNS_COALESCE_MS, () => {
      this.fire();
    });
  }

  public start(): void {
    if (this.unsubscribe !== null) return;

    this.unsubscribe = this.deps.atoms.onDidChange((root) => {
      this.changed(root);
    });
  }

  public stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.coalescer.cancel();
  }

  public flush(state: GraphState): void {
    this.coalescer.cancel();
    this.post(state);
  }

  private changed(root: string): void {
    if (root !== this.deps.root) return;

    const canPost = this.deps.gate.canPost();

    if (canPost) this.coalescer.arm();
  }

  private fire(): void {
    const canPost = this.deps.gate.canPost();

    if (!canPost) return;

    this.post(this.deps.gate.state());
  }

  private post(state: GraphState): void {
    const { root, atoms, ports } = this.deps;
    const message = atomsMessageOf(root, state, atoms.view);

    if (message !== null) ports.post(message);
  }
}
