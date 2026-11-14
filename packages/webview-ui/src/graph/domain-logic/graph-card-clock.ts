import type { CardClockBase, CardClockDeps } from '../common/card-clock.type.ts';
import type { TaskClocks } from '../common/task-canvas.type.ts';
import { cardClockText } from '../utils/card-clock.util.ts';

const TICK_MS = 1000;

const baseEntryOf = (entry: [string, number], at: number): [string, CardClockBase] => {
  const [id, elapsedMs] = entry;
  const base: CardClockBase = { elapsedMs, receivedAt: at };

  return [id, base];
};

const textEntryOf = (entry: [string, CardClockBase], at: number): [string, string] => {
  const [id, base] = entry;
  const text = cardClockText(base.elapsedMs + at - base.receivedAt);

  return [id, text];
};

/** Same ids with the same texts; key order does not matter. */
const isSameClocks = (next: TaskClocks, last: TaskClocks): boolean => {
  const nextIds = Object.keys(next);
  const isSameSize = nextIds.length === Object.keys(last).length;

  return isSameSize && nextIds.every((id) => Object.hasOwn(last, id) && last[id] === next[id]);
};

/**
 * Keeps every clocked card's text current with one `setInterval(1000)`, armed only while a base exists. Each base is the
 * host's elapsed ms and the page time it arrived; a text is extrapolated with the page's own `now`. A hidden page's tick
 * writes nothing and `shown` catches up; a runs message writes even while hidden, so an ended run never keeps a clock.
 */
export class GraphCardClock {
  private readonly deps: CardClockDeps;
  private bases = new Map<string, CardClockBase>();
  private written: TaskClocks = {};
  private timer: number | null = null;

  public constructor(deps: CardClockDeps) {
    this.deps = deps;
  }

  public runs(elapsed: Readonly<Record<string, number>> | undefined, at: number): void {
    const entries = Object.entries(elapsed ?? {});
    const bases = entries.map((entry) => baseEntryOf(entry, at));

    this.bases = new Map(bases);
    this.write(at);
    this.sync();
  }

  public shown(): void {
    const isHidden = this.deps.isHidden();
    const isIdle = isHidden || this.bases.size === 0;

    if (isIdle) return;

    this.write(this.deps.now());
  }

  private tick(): void {
    const isHidden = this.deps.isHidden();

    if (isHidden) return;

    this.write(this.deps.now());
  }

  /** Writes the texts at `at` only when they differ from the last ones written. */
  private write(at: number): void {
    const bases = [...this.bases];
    const entries = bases.map((entry) => textEntryOf(entry, at));
    const texts: TaskClocks = Object.fromEntries(entries);
    const isSame = isSameClocks(texts, this.written);

    if (isSame) return;

    this.written = texts;
    this.deps.canvas.clocks(texts);
  }

  /** Arms the interval on the first base and clears it when the last one goes. */
  private sync(): void {
    const hasBases = this.bases.size > 0;

    if (hasBases && this.timer === null) {
      this.timer = this.deps.setInterval((): void => this.tick(), TICK_MS);

      return;
    }

    if (hasBases || this.timer === null) return;

    this.deps.clearInterval(this.timer);
    this.timer = null;
  }
}
