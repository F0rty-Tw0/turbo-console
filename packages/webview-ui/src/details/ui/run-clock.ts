import type { RunView } from '../../bridge/common/details-state.type.ts';
import type { RunTexts } from '../common/details-page.type.ts';
import { runText } from '../utils/run-view.util.ts';

type RunningText = {
  readonly element: HTMLElement;
  readonly run: RunView;
  readonly receivedAt: number;
};

const TICK_MS = 1000;

const writeText = (entry: RunningText): void => {
  const sinceReceivedMs = performance.now() - entry.receivedAt;

  entry.element.textContent = runText(entry.run, sinceReceivedMs);
};

/**
 * Keeps every running card's clock text current with one `setInterval(1000)`, armed only while some card runs. Page time
 * comes from `performance.now()` since the view arrived, never from a host timestamp: a remote host's clock can differ.
 */
export class RunClock implements RunTexts {
  private readonly running = new Map<string, RunningText>();
  private stopTicks: (() => void) | null = null;

  public show(taskId: string, element: HTMLElement, run: RunView): void {
    const receivedAt = performance.now();
    const entry: RunningText = { element, run, receivedAt };

    writeText(entry);

    if (run.elapsedMs === null) {
      this.drop(taskId);

      return;
    }

    this.running.set(taskId, entry);
    this.sync();
  }

  public drop(taskId: string): void {
    this.running.delete(taskId);
    this.sync();
  }

  public reset(): void {
    this.running.clear();
    this.sync();
  }

  private sync(): void {
    const isIdle = this.running.size === 0;

    if (isIdle && this.stopTicks !== null) {
      this.stopTicks();
      this.stopTicks = null;

      return;
    }

    if (isIdle || this.stopTicks !== null) return;

    const timer = setInterval((): void => this.tick(), TICK_MS);

    this.stopTicks = (): void => clearInterval(timer);
  }

  private tick(): void {
    for (const entry of this.running.values()) writeText(entry);
  }
}
