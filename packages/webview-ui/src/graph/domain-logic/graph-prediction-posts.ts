import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';

/**
 * Tells the host which packages task mode draws, so it loads their cache predictions: the distinct sorted package names
 * of the placed tasks, posted only while the toggle is on and a task layout is placed, never twice in a row for the same
 * set. Turning the toggle off or clearing the layout forgets the last post, so the next on or the next layout posts again.
 */
export class GraphPredictionPosts {
  private readonly bridge: Bridge;
  private isShown = false;
  private packageNames: string[] | null = null;
  private lastPosted: string | null = null;

  public constructor(bridge: Bridge) {
    this.bridge = bridge;
  }

  public shown(isShown: boolean): void {
    this.isShown = isShown;

    if (!isShown) this.lastPosted = null;

    this.post();
  }

  public placed(tasks: GraphTask[]): void {
    const names = new Set(tasks.map((task) => task.packageName));
    const distinct = [...names];

    this.packageNames = distinct.sort();
    this.post();
  }

  public clear(): void {
    this.packageNames = null;
    this.lastPosted = null;
  }

  private post(): void {
    const { packageNames } = this;

    if (!this.isShown || packageNames === null || packageNames.length === 0) return;

    const key = JSON.stringify(packageNames);

    if (key === this.lastPosted) return;

    this.lastPosted = key;
    this.bridge.post({ type: 'shownTaskPackages', packageNames });
  }
}
