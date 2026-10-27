import type { Disposable, TreeViewVisibilityChangeEvent } from 'vscode';

import type { RunEntry } from '../../run/common/run.type.ts';
import type { TickerApi } from '../../shared/common/api.type.ts';
import type { RunChanges, TickerPorts } from '../common/ticker.type.ts';
import type { VisibleView } from '../common/visible-view.type.ts';
import { runningBadgeOf } from '../utils/running-badge.util.ts';

const TICK_MS = 1000;

/**
 * Spec §4.6: one interval per window, armed only while a run is `running` and the bound Packages view is visible; each
 * tick fires only the running tasks' nodes, all in one call, so a tick costs O(running tasks) and VS Code redraws them
 * in one pass. The running set is fed by the run
 * store's changes alone. Unbound (an untrusted window, or after its binding is disposed) it counts as hidden. UB5a §3.4:
 * while bound it keeps the view's badge at the number of running runs on every root, and clears it on unbind.
 */
export class ElapsedTicker {
  private readonly running = new Map<string, Set<string>>();
  private readonly ports: TickerPorts;
  private readonly unsubscribe: () => void;
  private isVisible = false;
  private clear: (() => void) | null = null;
  private badgeView: VisibleView | null = null;
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
      this.badgeView = null;
      view.badge = undefined;
    };
    const binding: Disposable = { dispose: unbind };

    this.badgeView = view;
    this.isVisible = view.visible;
    this.sync();
    this.showBadge();

    return binding;
  }

  /** `TurboConsoleApi.ticker`: `ticks` reads, live, the interval ticks since activation (not the fire on show). */
  public api(): TickerApi {
    const api: TickerApi = { ticks: () => this.count };

    return api;
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
    this.showBadge();
  }

  private showBadge(): void {
    const view = this.badgeView;

    if (view === null) return;

    let count = 0;

    for (const ids of this.running.values()) count += ids.size;

    view.badge = runningBadgeOf(count);
  }

  /** On show, the running rows are stale by however long the view was hidden, so they fire at once. */
  private visibilityChanged(event: TreeViewVisibilityChangeEvent): void {
    const hasRuns = this.running.size > 0;

    this.isVisible = event.visible;

    if (event.visible && hasRuns) this.ports.fire(this.running);

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
    this.ports.fire(this.running);
  };
}
