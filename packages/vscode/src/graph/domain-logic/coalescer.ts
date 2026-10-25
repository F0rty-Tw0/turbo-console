/**
 * Turns a burst of `arm` calls into one `fire`, `delayMs` after the first of them. An `arm` while a fire is pending adds
 * nothing; `cancel` drops the pending fire, and the next `arm` starts a new window.
 */
export class Coalescer {
  private readonly delayMs: number;
  private readonly fire: () => void;
  private timer: NodeJS.Timeout | null = null;

  public constructor(delayMs: number, fire: () => void) {
    this.delayMs = delayMs;
    this.fire = fire;
  }

  public arm(): void {
    if (this.timer !== null) return;

    this.timer = setTimeout(() => {
      this.fired();
    }, this.delayMs);
  }

  public cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);

    this.timer = null;
  }

  private fired(): void {
    this.timer = null;
    this.fire();
  }
}
