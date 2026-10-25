import type { AtomResult, DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import type { AtomLookup } from './atom-view.type.ts';

/**
 * What `AtomLoads` reads and calls. `binaryOf` is `null` for a folder whose turbo is not resolved. `dryRun` and `results`
 * each settle on their own; a failed one rejects. `changed` fires when the view of one package of `root` changed.
 */
export type AtomLoadPorts = {
  readonly binaryOf: (root: string) => TurboBinary | null;
  readonly dryRun: (binary: TurboBinary, request: DryRunRequest, signal: AbortSignal) => Promise<DryRunState[]>;
  readonly results: (root: string, fileIds: ReadonlySet<string>) => Promise<Map<string, AtomResult>>;
  readonly log: (line: string) => void;
  readonly changed: (root: string, packageName: string) => void;
};

/** The half of `AtomLoadPorts` the host builds; `sharedAtomsOf` adds `changed`, which tells every listener. */
export type AtomHostPorts = Omit<AtomLoadPorts, 'changed'>;

/** Hears that the view of one package of `root` changed. */
export type AtomListener = (root: string, packageName: string) => void;

/**
 * The one `AtomLoads` of a window, shared by the tree and the graph: its public methods plus `onDidChange`, which
 * subscribes a listener and returns its remover. `dispose` forgets every listener, then aborts every load.
 */
export type SharedAtoms = {
  readonly view: AtomLookup;
  readonly childrenRequested: (root: string, packageName: string) => void;
  readonly runEnded: (root: string, packageName: string) => void;
  readonly refreshAll: () => void;
  readonly modelChanged: (root: string, model: WorkspaceModel | null) => void;
  readonly rootsKept: (kept: ReadonlySet<string>) => void;
  readonly dispose: () => void;
  readonly onDidChange: (listener: AtomListener) => () => void;
};
