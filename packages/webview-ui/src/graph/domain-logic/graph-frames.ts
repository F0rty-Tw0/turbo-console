/** When the latest graph arrived and how long its first drawn frame took; only a frame after a pending draw counts. */
export class GraphFrames {
  private readonly now: () => number;
  private at = 0;
  private first: number | null = null;
  private isPending = false;

  public constructor(now: () => number) {
    this.now = now;
  }

  /** A new graph arrived at `at`: forgets the first frame; no draw is pending yet. */
  public start(at: number): void {
    this.at = at;
    this.first = null;
    this.isPending = false;
  }

  public arm(): void {
    this.isPending = true;
  }

  /** A Cytoscape `render`: records the first frame's delay once per pending draw. */
  public mark(): void {
    if (!this.isPending) return;

    this.isPending = false;
    this.first = this.now() - this.at;
  }

  public receivedAt(): number {
    return this.at;
  }

  public firstFrameMs(): number | null {
    return this.first;
  }
}
