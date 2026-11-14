import type { ImportScanInput, PackageImportScan } from '@turbo-console/core';
import type { GraphHostMessage, GraphState, GraphTask, GraphWebviewMessage, LayoutGrouping } from '@turbo-console/webview-ui';

import type { GraphLayoutCacheEntry } from './graph-cache.type.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import type { ProgressChanges, ProgressRecords } from '../../run/common/run-progress.type.ts';
import type { RunLookup, Runs } from '../../run/common/run.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { SharedAffected } from '../../tree/common/affected.type.ts';
import type { SharedAtoms } from '../../tree/common/atom-load.type.ts';
import type { SharedPrediction } from '../../tree/common/prediction.type.ts';

/**
 * Editor effects of one graph panel. `openDetails` and `openAt` may reject; `readText` rejects on a file it cannot open and gives
 * `null` for one over the read cap; `realPath` gives the path with its symlinks resolved, `null` when it cannot and never
 * rejects; `scanImports` is core's `scanPackageImports`: it rejects with `signal.reason` on an abort and with the raw error
 * when the dir cannot be read; `pickSaveUri` gives the chosen path or `null` on a cancel and may reject, as may `writeBytes`;
 * `executeCommand` runs a registered command and may reject; `log` (failures), `info`, `showInfo` and `showError` take one
 * clean line and must not throw.
 */
export type GraphPorts = {
  readonly post: (message: GraphHostMessage) => void;
  readonly readCache: (root: string, grouping: LayoutGrouping) => GraphLayoutCacheEntry | null;
  readonly writeCache: (root: string, grouping: LayoutGrouping, entry: GraphLayoutCacheEntry) => void;
  readonly openDetails: (packageName: string) => Promise<void>;
  readonly readText: (path: string) => Promise<string | null>;
  readonly realPath: (path: string) => Promise<string | null>;
  readonly openAt: (path: string, line: number) => Promise<void>;
  readonly scanImports: (input: ImportScanInput) => Promise<PackageImportScan>;
  readonly setPanelVisible: (visible: boolean) => void;
  readonly log: (text: string) => void;
  readonly info: (text: string) => void;
  readonly pickSaveUri: (defaultPath: string) => Promise<string | null>;
  readonly writeBytes: (path: string, bytes: Uint8Array) => Promise<void>;
  readonly showInfo: (text: string) => void;
  readonly showError: (text: string) => void;
  readonly executeCommand: (command: string, arg: unknown) => Promise<void>;
  /** The wall clock `Date.now()`, the clock `RunEntry.launchedAt` is on. */
  readonly wallNow: () => number;
};

type PositionsTag = { readonly type: 'positions' };

type UncheckedPositionsMessage = {
  readonly type: 'positions';
  readonly hash: string;
  readonly positions: unknown;
  readonly routes?: unknown;
  readonly grouping: LayoutGrouping;
};

/** A message that passed `graphMessageSchema`: its `positions` and `routes` records are still unread. */
export type SchemaGraphMessage = Exclude<GraphWebviewMessage, PositionsTag> | UncheckedPositionsMessage;

type RequestTag = {
  readonly type: 'reload' | 'openDetails' | 'runTask' | 'stopTask' | 'shownUmbrellas' | 'shownTaskPackages' | 'setViewToggle';
};

/** A page request the session answers from the state it builds now: a reload, a package's details, a task run or stop, the umbrellas or task packages now shown or a flip of a tree toggle. */
export type GraphRequestMessage = Extract<GraphWebviewMessage, RequestTag>;

type RunTag = { readonly type: 'runTask' | 'stopTask' };

/** A page request to run or stop one task of the graph. */
export type GraphRunRequest = Extract<GraphWebviewMessage, RunTag>;

/** The task a run command names: its id and its package, which a listed `GraphTask` or a running entry both give. */
export type RunTarget = Pick<GraphTask, 'id' | 'packageName'>;

/** What a request is judged against: the state built now, the root, its coordinator, the ports a request may use and the session's feeds (the atoms it may ask to load and the toggles it may set). */
export type RequestContext = {
  readonly state: GraphState;
  readonly root: string;
  readonly coordinator: Pick<Coordinator, 'request'> | undefined;
  readonly ports: Pick<GraphPorts, 'openDetails' | 'log' | 'executeCommand'>;
  readonly feeds: GraphFeeds;
};

type ExplainTag = { readonly type: 'explainEdge' | 'openManifest' };

/** A page request to look into the graph: the reply to an edge or the opening of a package's manifest. */
export type ExplainRequest = Extract<GraphWebviewMessage, ExplainTag>;

type ImportTag = { readonly type: 'scanImports' | 'openImport' };

/** A page request about one link's imports: scan the dependent, or open one site (module-private: only `LookupRequest` reads it). */
type ImportRequest = Extract<GraphWebviewMessage, ImportTag>;

/** Every request `GraphLookups` answers. */
export type LookupRequest = ExplainRequest | ImportRequest;

/** What `answerRequest` needs of the session: the state it judges against, the workspace root, the ports and whether a reply may still be posted. */
export type ExplainContext = {
  readonly state: GraphState;
  readonly root: string;
  readonly ports: GraphPorts;
  readonly canPost: () => boolean;
};

/** What `GraphLookups` needs of its session: the root, the ports, the state built now, whether a reply may still be posted, and the drop-and-log of a message it does not answer. */
export type LookupGate = {
  readonly root: string;
  readonly ports: GraphPorts;
  readonly state: () => GraphState;
  readonly canPost: () => boolean;
  readonly drop: (value: unknown) => void;
};

/** What `ImportScans` needs of its session: a `LookupGate` without the drop-and-log, which only `GraphLookups` uses. */
export type ScanGate = Omit<LookupGate, 'drop'>;

/**
 * `canPost` is the session's check that the panel is shown, ready and alive; `state` is the state as it is now, `runIds` the ids a run can report,
 * `persistentIds` the ids whose running word is `continuous` and `tasks` the tasks the state lists, without the rest of the state.
 */
export type TaskFeedGate = {
  readonly canPost: () => boolean;
  readonly state: () => GraphState;
  readonly runIds: () => string[];
  readonly persistentIds: () => ReadonlySet<string>;
  readonly tasks: () => GraphTask[];
};

/** The tree command a graph run request maps to, with the tree-row argument it takes. */
export type GraphRunCommand = {
  readonly command: string;
  readonly arg: unknown;
};

/** The four tree toggles a state carries: scope prefixes on package labels, `package.json` scripts beside turbo tasks, the cache prediction and the affected marks. */
export type GraphShown = {
  readonly scopeShown: boolean;
  readonly scriptsShown: boolean;
  readonly predictionShown: boolean;
  readonly affectedShown: boolean;
};

/** The tree's four toggles, which the graph reads, and sets for a `setViewToggle`. */
export type GraphToggles = {
  readonly scope: ScriptsToggleApi;
  readonly scripts: ScriptsToggleApi;
  readonly prediction: ScriptsToggleApi;
  readonly affected: ScriptsToggleApi;
};

/** The task progress a graph reads: the records of an id and the change feed that says which root they changed under. */
export type GraphProgress = ProgressRecords & ProgressChanges;

/** What a panel's feeds read: the run states of its root, the task progress of every run, the Atomizer loads and the cache prediction and the affected marks shared with the tree, and the tree's four toggles. */
export type GraphFeeds = {
  readonly runs: Runs;
  readonly progress: GraphProgress;
  readonly atoms: SharedAtoms;
  readonly prediction: SharedPrediction;
  readonly affected: SharedAffected;
  readonly toggles: GraphToggles;
};

/** What the runs message of a graph reads: the own run of an id, the progress records that name it, the ids whose running word is `continuous` and the wall clock read once for the message. */
export type RunSources = {
  readonly get: RunLookup;
  readonly recordsOf: ProgressRecords['recordsOf'];
  readonly persistentIds: ReadonlySet<string>;
  readonly wallNow: number;
};
