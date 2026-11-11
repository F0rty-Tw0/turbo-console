import type { AffectedResult, WorkspaceModel } from '@turbo-console/core';

import type { RootChange } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { AffectedLoadPorts, AffectedStatus, AffectedView } from '../common/affected.type.ts';
import { affectedViewOf } from '../utils/affected-view.util.ts';

type AffectedSlot = { readonly view: AffectedView | null; readonly controller: AbortController | null };

const statusOf = (slot: AffectedSlot | undefined): AffectedStatus => {
  if (slot === undefined) return 'absent';

  if (slot.controller !== null) return 'loading';

  if (slot.view === null) return 'failed';

  return 'loaded';
};

const viewOf = (result: AffectedResult, model: WorkspaceModel | null, settledAt: number): AffectedView => {
  if (model !== null) return affectedViewOf(result, model, settledAt);

  const empty: AffectedView = { settledAt, mode: result.mode, tasks: new Map() };

  return empty;
};

/**
 * The affected tasks of each root, one slot per root. No slot is Absent (or Off, while the toggle is off); a slot with a
 * controller is Loading and keeps its last view; none and a view is Loaded; none and no view is Failed. Only `rootShown`
 * creates a slot, and it ignores a root that has one, so a Failed root is not asked again by a tree that redraws on every
 * change. A result stores only while its controller is still the slot's, so a stale query never lands.
 */
export class AffectedLoads {
  private readonly ports: AffectedLoadPorts;
  private readonly slots = new Map<string, AffectedSlot>();
  private readonly waiting = new Set<string>();
  private shown = false;
  private disposed = false;

  public constructor(ports: AffectedLoadPorts) {
    this.ports = ports;
  }

  public view(root: string): AffectedView | null {
    const slot = this.slots.get(root);

    return slot?.view ?? null;
  }

  public status(root: string): AffectedStatus {
    const slot = this.slots.get(root);

    return statusOf(slot);
  }

  public rootShown(root: string): void {
    const isKnown = this.slots.has(root);

    if (!this.shown || isKnown) return;

    const isStarted = this.begin(root, null);

    if (isStarted) this.ports.changed(root);
  }

  /** Off aborts every query and drops every slot and wait; consumers follow the toggle's own event. */
  public toggled(shown: boolean): void {
    if (shown === this.shown || this.disposed) return;

    this.shown = shown;

    if (!shown) this.clear();
  }

  /** A new model asks again; the root that waited for a binary retries in any case, also on a republish of the same model. */
  public modelChanged(change: RootChange): void {
    const { root, before, after } = change;

    if (after !== before) this.restart(root);

    const isWaiting = this.waiting.has(root);
    const binary = this.ports.binaryOf(root);
    const hasBinary = binary !== null;

    if (!isWaiting || !hasBinary) return;

    this.waiting.delete(root);
    this.rootShown(root);
  }

  public refreshAll(): void {
    for (const root of this.slots.keys()) this.restart(root);
  }

  /** A removed root keeps nothing: its query aborts and nothing is announced. */
  public rootsKept(kept: ReadonlySet<string>): void {
    for (const [root, slot] of this.slots) {
      const isKept = kept.has(root);

      if (isKept) continue;

      slot.controller?.abort();
      this.slots.delete(root);
    }

    for (const root of this.waiting) {
      const isKept = kept.has(root);

      if (!isKept) this.waiting.delete(root);
    }
  }

  public dispose(): void {
    this.shown = false;
    this.disposed = true;
    this.clear();
  }

  private clear(): void {
    for (const slot of this.slots.values()) slot.controller?.abort();

    this.slots.clear();
    this.waiting.clear();
  }

  /** Spawns the query of `root` over its slot; false (the root waits for a binary, no slot) when turbo is not resolved. */
  private begin(root: string, view: AffectedView | null): boolean {
    const binary = this.ports.binaryOf(root);

    if (binary === null) {
      this.slots.delete(root);
      this.waiting.add(root);

      return false;
    }

    const controller = new AbortController();
    const onOk = (result: AffectedResult): void => {
      this.settle(root, controller, result);
    };
    const onFail = (error: unknown): void => {
      this.fail(root, controller, error);
    };

    this.slots.set(root, { view, controller });
    void this.ports.readAffected(binary, controller.signal).then(onOk, onFail);

    return true;
  }

  /** Moving into Loading from Loaded or Failed announces; Loading into Loading shows the same, so it does not. */
  private restart(root: string): void {
    const old = this.slots.get(root);

    if (old === undefined) return;

    const wasLive = old.controller !== null;
    const isStarted = this.begin(root, old.view);

    old.controller?.abort();

    if (!wasLive || !isStarted) this.ports.changed(root);
  }

  private settle(root: string, controller: AbortController, result: AffectedResult): void {
    if (this.slots.get(root)?.controller !== controller) return;

    const view = viewOf(result, this.ports.modelOf(root), this.ports.now());

    this.slots.set(root, { view, controller: null });
    this.ports.changed(root);
  }

  private fail(root: string, controller: AbortController, error: unknown): void {
    if (this.slots.get(root)?.controller !== controller) return;

    this.slots.set(root, { view: null, controller: null });
    this.ports.log(logTextOf(`affected ${root}: ${logTextOf(error)}`));
    this.ports.changed(root);
  }
}
