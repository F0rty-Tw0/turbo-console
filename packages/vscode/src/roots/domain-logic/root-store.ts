import type { Coordinator, RootChange, RootEntry, RootState } from '../common/coordinator.type.ts';
import type { LoadResult, RootFolder } from '../common/root.type.ts';
import { errorKeyOf } from '../utils/error-key.util.ts';

type ChangeListener = (change: RootChange) => void;

const emptyEntry = (folder: RootFolder, make: (folder: RootFolder) => Coordinator): RootEntry => {
  const state: RootState = { folder, binary: null, model: null, error: null };
  const entry: RootEntry = { state, coordinator: make(folder) };

  return entry;
};

/** A kept root takes the folder as given now, so a renamed folder at the same path shows its new name. */
const keptEntry = (entry: RootEntry, folder: RootFolder): RootEntry => {
  const state: RootState = { ...entry.state, folder };
  const kept: RootEntry = { state, coordinator: entry.coordinator };

  return kept;
};

/** A root seen before keeps its entry, with the folder as given now; a new root gets an empty one. */
const entryFor = (existing: RootEntry | undefined, folder: RootFolder, make: (folder: RootFolder) => Coordinator): RootEntry => {
  if (existing === undefined) return emptyEntry(folder, make);

  return keptEntry(existing, folder);
};

const stateAfter = (state: RootState, result: LoadResult): RootState => {
  if (result.kind === 'error') {
    const isUnrunnable = result.stage === 'binary' && state.binary === null;
    const model = isUnrunnable ? null : state.model;
    const failed: RootState = { ...state, model, error: result };

    return failed;
  }

  const next: RootState = { folder: state.folder, binary: result.binary, model: result.model, error: null };

  return next;
};

/** The roots of the window in folder order, each with its last applied state and its load coordinator. */
export class RootStore {
  private entries = new Map<string, RootEntry>();
  private readonly listeners = new Set<ChangeListener>();

  /**
   * Keeps the entries of folders still present (with the folder as given now), makes one for each new folder, and
   * disposes the removed ones. A root listed twice gets one entry, from its first folder.
   */
  public set(folders: RootFolder[], make: (folder: RootFolder) => Coordinator): void {
    const next = new Map<string, RootEntry>();

    for (const folder of folders) {
      const isListed = next.has(folder.root);

      if (isListed) continue;

      const existing = this.entries.get(folder.root);
      const entry = entryFor(existing, folder, make);

      next.set(folder.root, entry);
    }

    for (const [root, entry] of this.entries) {
      const isKept = next.has(root);

      if (!isKept) entry.coordinator.dispose();
    }

    this.entries = next;
  }

  public get(root: string): RootEntry | undefined {
    return this.entries.get(root);
  }

  public all(): RootEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * A model replaces the model and binary and clears the error; a failure sets the error and keeps the model, except a
   * binary failure while no binary was ever set (a cached model published before resolve), which clears it.
   */
  public apply(root: string, result: LoadResult): void {
    const entry = this.entries.get(root);

    if (entry === undefined) return;

    const state = stateAfter(entry.state, result);
    const change: RootChange = {
      root,
      before: entry.state.model,
      after: state.model,
      errorBefore: errorKeyOf(entry.state.error),
      errorAfter: errorKeyOf(state.error)
    };

    const applied: RootEntry = { state, coordinator: entry.coordinator };

    this.entries.set(root, applied);

    for (const listener of this.listeners) listener(change);
  }

  /** Fires on every `apply`, model or failure; returns the unsubscribe. */
  public onDidChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  }
}
