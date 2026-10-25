import type { AtomGroup, AtomResult, DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { AtomLoadPorts } from '../common/atom-load.type.ts';
import type { AtomCache, AtomLookup, AtomView } from '../common/atom-view.type.ts';
import { atomFileIds, atomIdsKey } from '../utils/atom-ids.util.ts';
import { staticAtomLookup } from '../utils/static-atoms.util.ts';

type Part = 'dry-run' | 'scan';

/** `ids` is the `atomIdsKey` the load started with; `dryRun` and `results` are `null` until their part settled OK. */
type LoadEntry = {
  readonly root: string;
  readonly packageName: string;
  readonly dryRun: ReadonlyMap<string, AtomCache> | null;
  readonly results: ReadonlyMap<string, AtomResult> | null;
  readonly ids: string;
  readonly controller: AbortController;
};

type EntryPatch = Partial<Pick<LoadEntry, 'dryRun' | 'results'>>;

const DRY_RUN_FAILED: EntryPatch = { dryRun: null };

const SCAN_FAILED: EntryPatch = { results: null };

const FAILED_PART: Record<Part, EntryPatch> = { 'dry-run': DRY_RUN_FAILED, scan: SCAN_FAILED };

const keyOf = (root: string, packageName: string): string => JSON.stringify([root, packageName]);

const cacheOf = (state: DryRunState): [string, AtomCache] => [state.id, state.cache];

const umbrellaNameOf = (group: AtomGroup): string => group.umbrella.name;

/**
 * The load of each package's Atomizer rows, one entry per `(root, packageName)`: a dry run and a results scan that settle
 * on their own. No entry is Not loaded; Loading, Loaded and Failed answer every event alike, so an entry holds no state
 * word. Only a children request creates an entry; a run end, a refresh or a model change then restarts or drops it
 * (spec 3.5, 3.6). A result of an aborted or replaced load is dropped before it stores, logs or announces anything.
 */
export class AtomLoads {
  private readonly ports: AtomLoadPorts;
  private readonly modelOf: (root: string) => WorkspaceModel | null;
  private readonly statics: AtomLookup;
  private readonly entries = new Map<string, LoadEntry>();

  public constructor(ports: AtomLoadPorts, modelOf: (root: string) => WorkspaceModel | null) {
    this.ports = ports;
    this.modelOf = modelOf;
    this.statics = staticAtomLookup(modelOf);
  }

  public view(root: string, packageName: string): AtomView {
    const base = this.statics(root, packageName);
    const entry = this.entries.get(keyOf(root, packageName));

    if (entry === undefined) return base;

    const view: AtomView = { groups: base.groups, dryRun: entry.dryRun, results: entry.results };

    return view;
  }

  /** Starts a load only for a package that is Not loaded: Loading, Loaded and Failed ignore it, so a tick never spawns turbo. */
  public childrenRequested(root: string, packageName: string): void {
    const isKnown = this.entries.has(keyOf(root, packageName));

    if (!isKnown) this.start(root, packageName);
  }

  public runEnded(root: string, packageName: string): void {
    const isKnown = this.entries.has(keyOf(root, packageName));

    if (isKnown) this.start(root, packageName);
  }

  public refreshAll(): void {
    for (const entry of this.snapshot()) this.start(entry.root, entry.packageName);
  }

  /** An entry whose package kept the same umbrella and file ids keeps its load; any other drops back to Not loaded. */
  public modelChanged(root: string, model: WorkspaceModel | null): void {
    for (const entry of this.snapshot()) {
      if (entry.root !== root) continue;

      const ids = this.idsOf(entry, model);

      if (ids !== entry.ids) this.drop(entry);
    }
  }

  public dispose(): void {
    for (const entry of this.entries.values()) entry.controller.abort();

    this.entries.clear();
  }

  /** Does nothing without a turbo binary, a model or a group: the entry, if any, stays as it is. */
  private start(root: string, packageName: string): void {
    const binary = this.ports.binaryOf(root);
    const model = this.modelOf(root);
    const { groups } = this.statics(root, packageName);

    if (binary === null || model === null || groups.length === 0) return;

    const key = keyOf(root, packageName);
    const previous = this.entries.get(key);
    const controller = new AbortController();
    const ids = atomIdsKey(groups);
    const dryRun = previous?.dryRun ?? null;
    const results = previous?.results ?? null;
    const entry: LoadEntry = { root, packageName, dryRun, results, ids, controller };
    const tasks = groups.map(umbrellaNameOf);
    const request: DryRunRequest = { tasks, packages: [packageName], singlePackage: model.singlePackage };

    previous?.controller.abort();
    this.entries.set(key, entry);
    this.launch(entry, binary, request, atomFileIds(groups));
  }

  private launch(entry: LoadEntry, binary: TurboBinary, request: DryRunRequest, fileIds: string[]): void {
    const dry = this.ports.dryRun(binary, request, entry.controller.signal);
    const scan = this.ports.results(entry.root, new Set(fileIds));
    const onStates = (states: DryRunState[]): void => {
      const dryRun = new Map(states.map(cacheOf));

      this.commit(entry, { dryRun });
    };
    const onResults = (results: Map<string, AtomResult>): void => {
      this.commit(entry, { results });
    };
    const onDryFailed = (error: unknown): void => {
      this.fail(entry, 'dry-run', error);
    };
    const onScanFailed = (error: unknown): void => {
      this.fail(entry, 'scan', error);
    };

    void dry.then(onStates, onDryFailed);
    void scan.then(onResults, onScanFailed);
  }

  private fail(source: LoadEntry, part: Part, error: unknown): void {
    const live = this.liveOf(source);

    if (live === null) return;

    this.ports.log(`atoms ${source.packageName}: ${part} failed: ${logTextOf(error)}`);
    this.commit(source, FAILED_PART[part]);
  }

  private commit(source: LoadEntry, patch: EntryPatch): void {
    const live = this.liveOf(source);

    if (live === null) return;

    const next: LoadEntry = { ...live, ...patch };

    this.entries.set(keyOf(live.root, live.packageName), next);
    this.ports.changed(live.root, live.packageName);
  }

  private snapshot(): LoadEntry[] {
    const values = this.entries.values();

    return [...values];
  }

  /** The entry now stored for `source`'s package, or `null` when that load was aborted, replaced or dropped. */
  private liveOf(source: LoadEntry): LoadEntry | null {
    const live = this.entries.get(keyOf(source.root, source.packageName));

    if (live?.controller !== source.controller) return null;

    return live;
  }

  private idsOf(entry: LoadEntry, model: WorkspaceModel | null): string {
    if (model === null) return '';

    const { groups } = this.statics(entry.root, entry.packageName);

    return atomIdsKey(groups);
  }

  private drop(entry: LoadEntry): void {
    entry.controller.abort();
    this.entries.delete(keyOf(entry.root, entry.packageName));
    this.ports.changed(entry.root, entry.packageName);
  }
}
