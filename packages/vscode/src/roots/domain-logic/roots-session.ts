import { LoadCoordinator } from './load-coordinator.ts';
import { loadRoot } from './load-root.ts';
import { LoadSlots } from './load-slots.ts';
import { RootStore } from './root-store.ts';
import { VisiblePanels } from './visible-panels.ts';
import { LOG_LINE_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { DEBOUNCE_MS } from '../../watch/common/watch.const.ts';
import { Debouncer } from '../../watch/domain-logic/debouncer.ts';
import type { ChangeReason, CoordinatorPorts, LoadRecord, Session } from '../common/coordinator.type.ts';
import type { LoadDeps, LoadResult, RootFolder, SessionPorts } from '../common/root.type.ts';
import { MAX_CONCURRENT_LOADS } from '../common/roots.const.ts';
import { findRoots } from '../data-access/find-roots.ts';

/**
 * The roots of the window: the store, one coordinator per root over its own `LoadDeps`, one set of load slots shared
 * by all of them, and the load records the integration tests read. `loads` holds an empty list per root from the moment
 * the root is set. The view's visibility lives here, so a coordinator built before the view exists can read it.
 * Watcher events reach it through `changed`, debounced per root into one `watch` request.
 */
export class RootsSession implements Session {
  public readonly store = new RootStore();
  public readonly loads = new Map<string, LoadRecord[]>();
  private readonly ports: SessionPorts;
  private readonly slots = new LoadSlots(MAX_CONCURRENT_LOADS);
  private readonly debouncer: Debouncer;
  private readonly panels = new VisiblePanels();
  /** When the last `findRoots` answered (`ports.now`), for activation's timing; `null` before the first answer. */
  public rootsFoundAt: number | null = null;
  private isVisible = false;
  private foldersGeneration = 0;

  public constructor(ports: SessionPorts) {
    const flush = (root: string): void => {
      this.store.get(root)?.coordinator.request('watch');
    };

    this.ports = ports;
    this.debouncer = new Debouncer(DEBOUNCE_MS, flush);
  }

  /**
   * Sets the folders that are roots (`findRoots`) and returns the roots now set. A call overtaken by a newer one while
   * it read the disk sets nothing: folder changes can land in quick succession, and the newest set wins.
   */
  public async setWorkspaceFolders(folders: RootFolder[]): Promise<RootFolder[]> {
    this.foldersGeneration += 1;

    const generation = this.foldersGeneration;
    const roots = await findRoots(folders);

    this.rootsFoundAt = this.ports.now();

    if (generation === this.foldersGeneration) this.setRoots(roots);

    return this.store.all().map((entry) => entry.state.folder);
  }

  public setRoots(roots: RootFolder[]): void {
    const make = (folder: RootFolder): LoadCoordinator => this.coordinatorFor(folder);
    const kept = new Set(roots.map((folder) => folder.root));

    this.store.set(roots, make);

    for (const root of this.loads.keys()) {
      const isKept = kept.has(root);

      if (!isKept) this.loads.delete(root);
    }

    for (const root of kept) {
      const isListed = this.loads.has(root);

      if (!isListed) this.loads.set(root, []);
    }

    this.panels.keepOnly(kept);
  }

  /** A view turning visible shows every root: a never-loaded root starts its cache-first load, a stale one a full load. */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;

    if (!visible) return;

    for (const entry of this.store.all()) entry.coordinator.show();
  }

  /**
   * A visible package-details panel counts as a visible view for its root: a hidden tree no longer stops its loads. A
   * folder that is not a root is ignored, so it never counts as visible if it becomes one later.
   */
  public setPanelVisible(root: string, panelId: string, visible: boolean): void {
    const entry = this.store.get(root);

    if (visible && entry === undefined) return;

    this.panels.set(root, panelId, visible);

    if (visible) entry?.coordinator.show();
  }

  public request(reason: ChangeReason): void {
    for (const entry of this.store.all()) entry.coordinator.request(reason);
  }

  /** A watcher saw a change under `root` that may change its model. */
  public changed(root: string): void {
    this.debouncer.push(root);
  }

  public dispose(): void {
    this.debouncer.dispose();
    this.setRoots([]);
  }

  /** Resolves when the root has no debounced change pending and no load in flight; rejects for an unknown root key. */
  public async whenIdle(root: string): Promise<void> {
    const entry = this.store.get(root);

    if (entry === undefined) {
      const known = Array.from(this.loads.keys()).join(', ');

      throw new Error(`unknown root ${root}; known: ${known}`);
    }

    await this.debouncer.whenFlushed(root);
    await entry.coordinator.whenSettled();
  }

  private coordinatorFor(folder: RootFolder): LoadCoordinator {
    const { root } = folder;
    const acquire = async (signal: AbortSignal): Promise<() => void> => this.slots.acquire(signal);
    const deps = this.ports.depsFor(root, acquire);
    const isVisible = (): boolean => this.isVisible || this.panels.has(root);
    const ports: CoordinatorPorts = {
      run: async (mode, signal, publish) => loadRoot(mode, deps, signal, publish),
      isVisible,
      apply: (result) => {
        this.apply(root, result, deps);
      },
      record: (record) => {
        this.loads.get(root)?.push(record);
      },
      now: this.ports.now
    };

    return new LoadCoordinator(ports);
  }

  /**
   * Every model that reaches the store logs its warnings, one clean line each (spec §4.3), whether a cache read or a
   * full load produced it. `CoordinatorPorts.apply` must not throw: a store listener that throws is logged instead.
   */
  private apply(root: string, result: LoadResult, deps: LoadDeps): void {
    try {
      this.store.apply(root, result);

      if (result.kind === 'model') {
        for (const warning of result.model.warnings) this.ports.warn(cleanText(warning, LOG_LINE_MAX));
      }
    } catch (error) {
      deps.log(logTextOf(error));
    }
  }
}
