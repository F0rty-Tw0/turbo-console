type Waiter = {
  readonly grant: () => void;
};

/**
 * A FIFO of load slots shared by every root (spec §6 budget): `acquire` resolves with a release once a slot is free.
 * A waiter whose signal aborts leaves the queue and rejects with the reason; an already aborted signal rejects at once
 * and takes nothing. A release frees its slot once, however often it is called, and never throws.
 */
export class LoadSlots {
  private free: number;
  private readonly waiters: Waiter[] = [];

  public constructor(size: number) {
    this.free = size;
  }

  public async acquire(signal: AbortSignal): Promise<() => void> {
    const { promise, resolve, reject } = Promise.withResolvers<() => void>();

    if (signal.aborted) {
      reject(signal.reason);

      return promise;
    }

    if (this.free > 0) {
      this.free -= 1;
      resolve(this.releaseOnce());

      return promise;
    }

    const listening = new AbortController();
    const grant = (): void => {
      listening.abort();
      resolve(this.releaseOnce());
    };
    const waiter: Waiter = { grant };
    const abort = (): void => {
      this.leave(waiter);
      reject(signal.reason);
    };

    signal.addEventListener('abort', abort, { once: true, signal: listening.signal });
    this.waiters.push(waiter);

    return promise;
  }

  private releaseOnce(): () => void {
    let isReleased = false;

    return (): void => {
      if (isReleased) return;

      isReleased = true;
      this.handOn();
    };
  }

  /** The slot goes straight to the next waiter (every queued waiter is live: an abort removes it), else back to free. */
  private handOn(): void {
    const next = this.waiters.shift();

    if (next === undefined) {
      this.free += 1;

      return;
    }

    next.grant();
  }

  private leave(waiter: Waiter): void {
    const index = this.waiters.indexOf(waiter);

    if (index !== -1) this.waiters.splice(index, 1);
  }
}
