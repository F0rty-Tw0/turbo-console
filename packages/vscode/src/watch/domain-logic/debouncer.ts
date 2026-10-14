type Pending = {
  readonly timer: ReturnType<typeof setTimeout>;
  readonly flushed: PromiseWithResolvers<undefined>;
};

/**
 * Spec §4.3: one timer per root. A push restarts that root's timer, and `flush` runs once the root saw no push for
 * `delayMs`. Waiters of a root resolve after its flush, or on `dispose`, which cancels every pending flush.
 */
export class Debouncer {
  private readonly delayMs: number;
  private readonly flush: (root: string) => void;
  private readonly pending = new Map<string, Pending>();
  private disposed = false;

  public constructor(delayMs: number, flush: (root: string) => void) {
    this.delayMs = delayMs;
    this.flush = flush;
  }

  public push(root: string): void {
    if (this.disposed) return;

    const before = this.pending.get(root);
    const flushed = before?.flushed ?? Promise.withResolvers<undefined>();
    const fire = (): void => {
      this.fire(root, flushed);
    };

    clearTimeout(before?.timer);

    const timer = setTimeout(fire, this.delayMs);

    this.pending.set(root, { timer, flushed });
  }

  /** Resolves at once when the root has no pending flush. */
  public async whenFlushed(root: string): Promise<void> {
    const entry = this.pending.get(root);

    if (entry === undefined) return;

    await entry.flushed.promise;
  }

  public dispose(): void {
    this.disposed = true;

    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.flushed.resolve(undefined);
    }

    this.pending.clear();
  }

  private fire(root: string, flushed: PromiseWithResolvers<undefined>): void {
    this.pending.delete(root);

    try {
      this.flush(root);
    } finally {
      flushed.resolve(undefined);
    }
  }
}
