import type { Disposable, TreeViewVisibilityChangeEvent } from 'vscode';

import type { RunEntry } from '../../run/common/run.type.ts';
import type { RunChanges, TickerPorts } from '../common/ticker.type.ts';
import type { VisibleView } from '../common/visible-view.type.ts';

const TICK_MS = 1000;

/**
 * Spec §4.6: one interval per window, armed only while a run is `running` and the bound Packages view is visible; each
 * tick fires only the running tasks' nodes, so a tick costs O(running tasks). The running set is fed by the run
 * store's changes alone. Unbound (an untrusted window, or after its binding is disposed) it counts as hidden.
 */
export class ElapsedTicker {
  private readonly running = new Map<string, Set<string>>();
  private readonly ports: TickerPorts;
  private readonly unsubscribe: () => void;
  private isVisible = false;
  private clear: (() => void) | null = null;
  private count = 0;

  public constructor(runs: RunChanges, ports: TickerPorts) {
    this.ports = ports;
    this.unsubscribe = runs.onDidChange((entry) => {
      this.changed(entry);
    });
  }

  /** Follows `view`'s visibility until the returned binding is disposed. */
  public bind(view: VisibleView): Disposable {
    const subscription = view.onDidChangeVisibility((event) => {
      this.visibilityChanged(event);
    });
    const unbind = (): void => {
      subscription.dispose();
      this.isVisible = false;
      this.sync();
    };
    const binding: Disposable = { dispose: unbind };

    this.isVisible = view.visible;
    this.sync();

    return binding;
  }

  /** Ticks since activation, for `TurboConsoleApi.ticker`. */
  public ticks(): number {
    return this.count;
  }

  public dispose(): void {
    this.unsubscribe();
    this.running.clear();
    this.sync();
  }

  private changed(entry: RunEntry): void {
    const ids = this.running.get(entry.root) ?? new Set<string>();

    if (entry.state === 'running') ids.add(entry.taskId);
    else ids.delete(entry.taskId);

    if (ids.size === 0) this.running.delete(entry.root);
    else this.running.set(entry.root, ids);

    this.sync();
  }

  /** On show, the running rows are stale by however long the view was hidden, so they fire at once. */
  private visibilityChanged(event: TreeViewVisibilityChangeEvent): void {
    this.isVisible = event.visible;

    if (event.visible) this.fireRunning();

    this.sync();
  }

  private sync(): void {
    const isArmed = this.clear !== null;
    const shouldArm = this.isVisible && this.running.size > 0;

    if (shouldArm && !isArmed) this.clear = this.ports.every(TICK_MS, this.tick);

    if (!shouldArm && this.clear !== null) {
      this.clear();
      this.clear = null;
    }
  }

  private readonly tick = (): void => {
    this.count += 1;
    this.fireRunning();
  };

  private fireRunning(): void {
    for (const [root, ids] of this.running) {
      for (const taskId of ids) this.ports.fire(root, taskId);
    }
  }
}
