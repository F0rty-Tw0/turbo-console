import { PREDICTION_BATCH_MAX, PREDICTION_BATCH_MS } from '../common/prediction.const.ts';
import type { PredictionClockPorts, PredictionTicket, PredictionTimer } from '../common/prediction.type.ts';

/** `pending` waits for its window; `due` says that window is over. `live` is the one run of the root that spawns turbo. */
type Slot = {
  pending: PredictionTicket | null;
  timer: PredictionTimer | null;
  // eslint-disable-next-line local/readonly-type-properties -- set in place when the window ends or the pending ticket is sent
  due: boolean;
  live: PredictionTicket | null;
};

const ticketOf = (root: string): PredictionTicket => {
  const ticket: PredictionTicket = { root, members: new Set<string>(), controller: new AbortController() };

  return ticket;
};

const chunkOf = (pending: PredictionTicket): PredictionTicket => {
  const chunk = ticketOf(pending.root);
  const members = [...pending.members];
  const first = members.slice(0, PREDICTION_BATCH_MAX);

  for (const packageName of first) {
    chunk.members.add(packageName);
    pending.members.delete(packageName);
  }

  return chunk;
};

/** The whole pending ticket when it fits, else a new ticket of its first `PREDICTION_BATCH_MAX` members; the rest stays pending and due. */
const takeNext = (slot: Slot, pending: PredictionTicket): PredictionTicket => {
  const isWhole = pending.members.size <= PREDICTION_BATCH_MAX;

  if (!isWhole) return chunkOf(pending);

  slot.pending = null;
  slot.due = false;

  return pending;
};

/**
 * Per root, the packages shown inside one fixed window become one ticket, and a ticket becomes live when the window is
 * over and no ticket of the root is live. A ticket of more than `PREDICTION_BATCH_MAX` packages sends that many and keeps the
 * rest waiting, due at once. A live ticket that loses its last member is aborted; one that keeps a member never is.
 */
export class PredictionBatches {
  private readonly ports: PredictionClockPorts;
  private readonly send: (ticket: PredictionTicket) => void;
  private readonly slots = new Map<string, Slot>();

  public constructor(ports: PredictionClockPorts, send: (ticket: PredictionTicket) => void) {
    this.ports = ports;
    this.send = send;
  }

  /** The window opens at the first join of a ticket; later joins add no timer. */
  public join(root: string, packageName: string): PredictionTicket {
    const slot = this.slotOf(root);
    const pending = slot.pending ?? this.open(root, slot);

    pending.members.add(packageName);

    return pending;
  }

  public leave(ticket: PredictionTicket, packageName: string): void {
    ticket.members.delete(packageName);

    const slot = this.slots.get(ticket.root);

    if (ticket.members.size > 0 || slot === undefined) return;

    if (slot.pending === ticket) this.dropPending(slot);

    if (slot.live === ticket) this.free(slot, ticket);
  }

  public isLive(ticket: PredictionTicket): boolean {
    return this.slots.get(ticket.root)?.live === ticket;
  }

  /** Frees the root for the next chunk, which goes at once when its window is already over. Idempotent. */
  public finished(ticket: PredictionTicket): void {
    const slot = this.slots.get(ticket.root);

    if (slot?.live === ticket) this.free(slot, ticket);
  }

  public dropRoot(root: string): void {
    const slot = this.slots.get(root);

    if (slot === undefined) return;

    this.cancelTimer(slot);
    slot.live?.controller.abort();
    this.slots.delete(root);
  }

  public clear(): void {
    const keys = this.slots.keys();
    const roots = [...keys];

    for (const root of roots) this.dropRoot(root);
  }

  private slotOf(root: string): Slot {
    const known = this.slots.get(root);
    const slot: Slot = known ?? { pending: null, timer: null, due: false, live: null };

    this.slots.set(root, slot);

    return slot;
  }

  private open(root: string, slot: Slot): PredictionTicket {
    const ticket = ticketOf(root);
    const windowOver = (): void => {
      this.over(slot);
    };

    slot.pending = ticket;
    slot.due = false;
    slot.timer = this.ports.after(windowOver, PREDICTION_BATCH_MS);

    return ticket;
  }

  private over(slot: Slot): void {
    slot.timer = null;
    slot.due = true;

    if (slot.live === null) this.dispatch(slot);
  }

  private dispatch(slot: Slot): void {
    const pending = slot.pending;

    if (pending === null) return;

    const live = takeNext(slot, pending);

    slot.live = live;
    this.send(live);
  }

  private dropPending(slot: Slot): void {
    this.cancelTimer(slot);
    slot.pending = null;
    slot.due = false;
  }

  private free(slot: Slot, ticket: PredictionTicket): void {
    if (ticket.members.size === 0) ticket.controller.abort();

    slot.live = null;

    if (slot.due) this.dispatch(slot);
  }

  private cancelTimer(slot: Slot): void {
    if (slot.timer !== null) this.ports.cancel(slot.timer);

    slot.timer = null;
  }
}
