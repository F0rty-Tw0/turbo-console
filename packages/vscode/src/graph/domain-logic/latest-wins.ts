/**
 * Runs one job at a time. A job that arrives while another runs waits in a single slot, and each newer arrival replaces
 * it; `run` for a replaced job resolves at once without running it. When the running job finishes, the waiting one runs,
 * and the `run` that started the chain resolves after the last of them.
 */
export class LatestWins<T> {
  private isRunning = false;
  private waiting: [T] | null = null;

  public async run(job: T, work: (job: T) => Promise<void>): Promise<void> {
    if (this.isRunning) {
      this.waiting = [job];

      return;
    }

    this.isRunning = true;

    try {
      let next: [T] | null = [job];

      while (next !== null) {
        await work(next[0]);
        next = this.takeWaiting();
      }
    } finally {
      this.isRunning = false;
    }
  }

  private takeWaiting(): [T] | null {
    const taken = this.waiting;

    this.waiting = null;

    return taken;
  }
}
