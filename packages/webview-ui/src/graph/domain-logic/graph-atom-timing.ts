/** Times a group toggle from the call to the first frame drawn after it. */
export class GraphAtomTiming {
  private readonly now: () => number;
  private startedAt: number | null = null;
  private measured: number | null = null;

  public constructor(now: () => number) {
    this.now = now;
  }

  /** A toggle begins: the clock starts and the last measure is forgotten. */
  public start(): void {
    this.startedAt = this.now();
    this.measured = null;
  }

  /** A frame was drawn: the first one after a toggle ends its timing. */
  public rendered(): void {
    const start = this.startedAt;

    if (start === null) return;

    this.measured = this.now() - start;
    this.startedAt = null;
  }

  /** From the latest toggle to the first frame drawn after it; `null` until that frame. */
  public ms(): number | null {
    return this.measured;
  }
}
