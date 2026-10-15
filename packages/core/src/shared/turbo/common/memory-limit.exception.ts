/** Why a turbo child was killed: its resident memory passed the bound. `runTurbo` aborts with it as the signal reason. */
export class MemoryLimitError extends Error {
  public override readonly name = 'MemoryLimitError';
  public readonly maxRssBytes: number;
  public readonly rss: number;

  public constructor(maxRssBytes: number, rss: number) {
    super(`resident memory ${rss} bytes passed the ${maxRssBytes} byte bound`);
    this.maxRssBytes = maxRssBytes;
    this.rss = rss;
  }
}
