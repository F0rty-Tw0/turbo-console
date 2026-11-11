import type { GraphAffected, GraphState } from '@turbo-console/webview-ui';

import type { GraphFeeds, TaskFeedGate } from '../common/graph.type.ts';
import { affectedOf } from '../utils/graph-affected.util.ts';

type AffectedFeedDeps = {
  readonly root: string;
  readonly feeds: Pick<GraphFeeds, 'affected' | 'toggles'>;
  readonly gate: Pick<TaskFeedGate, 'tasks'>;
  readonly changed: (root: string) => void;
};

/**
 * The `affected` key of the `runs` messages of one graph panel: the marks of the listed tasks while the affected toggle is on,
 * `null` while it is off or the store has no view. It remembers the JSON of the last value sent, so an unforced post carries the
 * key only when it changed, and it asks the store to check the root when a state with the toggle on is posted.
 */
export class GraphAffectedFeed {
  private readonly deps: AffectedFeedDeps;
  private unsubscribe: (() => void) | null = null;
  private last: string | null = null;

  public constructor(deps: AffectedFeedDeps) {
    this.deps = deps;
  }

  public start(): void {
    if (this.unsubscribe !== null) return;

    this.unsubscribe = this.deps.feeds.affected.onDidChange((root) => {
      this.deps.changed(root);
    });
  }

  public stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Runs for a state about to be posted forced: a shown graph with the toggle on starts the store's check of this root. */
  public flushed(state: GraphState): void {
    if (state.kind === 'graph' && state.affectedShown) this.deps.feeds.affected.rootShown(this.deps.root);
  }

  /**
   * What the `affected` key of the next `runs` message holds, or `undefined` when it has no key: an unforced post whose value
   * equals the last one sent. A forced post always carries it. The memory starts as "nothing sent".
   */
  public toPost(isForced: boolean): GraphAffected | null | undefined {
    const now = this.now();
    const text = JSON.stringify(now);

    if (!isForced && text === this.last) return undefined;

    this.last = text;

    return now;
  }

  /** The marks of the listed tasks, or `null` while the toggle is off, without reading the store. */
  private now(): GraphAffected | null {
    const { root, feeds, gate } = this.deps;

    const isShown = feeds.toggles.affected.isShown();

    if (!isShown) return null;

    return affectedOf(gate.tasks(), feeds.affected.view(root));
  }
}
