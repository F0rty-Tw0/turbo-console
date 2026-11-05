import { RUN_LOG_POLL_MS } from '../common/run-log-tail.const.ts';

type RunLogPoll = ReturnType<typeof setInterval>;

/**
 * One repeating timer per root: FSEvents reports a write to the log file turbo keeps open only on close, so the folder
 * watcher alone sees nothing until the run ends. The timer never keeps the process alive.
 */
export class RunLogPolls {
  private readonly polls = new Map<string, RunLogPoll>();

  /** Calls `onPoll` every `RUN_LOG_POLL_MS` until `stop`; a root already polled keeps its timer. */
  public start(root: string, onPoll: () => void): void {
    const isPolled = this.polls.has(root);

    if (isPolled) return;

    const timer = setInterval(onPoll, RUN_LOG_POLL_MS);

    timer.unref();
    this.polls.set(root, timer);
  }

  public stop(root: string): void {
    const timer = this.polls.get(root);

    if (timer === undefined) return;

    clearInterval(timer);
    this.polls.delete(root);
  }
}
