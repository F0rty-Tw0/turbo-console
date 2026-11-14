import type { GraphAffected } from './graph-affected.type.ts';
import type { GraphAtomsMessage } from './graph-atoms-message.type.ts';
import type { GraphEdgeImportsMessage, GraphOpenImportMessage, GraphScanImportsMessage } from './graph-imports.type.ts';
import type { GraphRunState, GraphState, Positions, Routes } from './graph-state.type.ts';

/** The `package.json` field that holds a dependency entry. */
export type ManifestField = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

/** The lines around an entry's key line, each cut like `spec`; a side is absent at the start or end of the file. */
export type ManifestContext = {
  readonly before?: string;
  readonly after?: string;
};

/** One entry of a dependent's `package.json`: `line` is 0-based; `key` and `spec` are cut to `ENTRY_TEXT_MAX` characters plus `…`. */
export type ManifestEntry = {
  readonly field: ManifestField;
  readonly key: string;
  readonly spec: string;
  readonly line: number;
  readonly context: ManifestContext;
};

type FoundResult = {
  readonly kind: 'found';
  readonly file: string;
  readonly entries: ManifestEntry[];
};

type MissingResult = {
  readonly kind: 'missing';
  readonly file: string;
};

type UnreadableResult = {
  readonly kind: 'unreadable';
  readonly file: string;
};

/** What the host found in the dependent's `package.json`; `file` is relative to the workspace root, `entries` holds 1 to `MANIFEST_ENTRIES_MAX`. */
export type EdgeExplainResult = FoundResult | MissingResult | UnreadableResult;

export type GraphStateMessage = {
  readonly type: 'state';
  readonly state: GraphState;
};

export type GraphEdgeExplainedMessage = {
  readonly type: 'edgeExplained';
  readonly source: string;
  readonly target: string;
  readonly result: EdgeExplainResult;
};

/** The wire words for the dry-run answers `HIT` (`cached`), `MISS` (`notCached`) and `deferred` (`unknown`). */
export type GraphPrediction = 'cached' | 'notCached' | 'unknown';

export type GraphRunsMessage = {
  readonly type: 'runs';
  readonly runs: Readonly<Record<string, GraphRunState>>;
  /**
   * Task id → the task id of the run that runs it, only while the task runs under another task's run and not on its own (spec D11);
   * absent when none.
   */
  readonly owners?: Readonly<Record<string, string>>;
  /**
   * Task id to prediction, only for the tasks the store answered. Present: replaces every mark, and `{}` clears them all. `{}` is
   * sent on the first post after the prediction toggle turns off and on every forced post while it is off, and also while it is on
   * with no answers. Absent: the predictions did not change since the last message that carried them and the post is not forced,
   * so the page keeps its marks. A reloaded or new page always gets the key.
   */
  readonly predictions?: Readonly<Record<string, GraphPrediction>>;
  /**
   * The affected marks of the listed tasks. An object replaces every mark (an empty `tasks` clears them all); `null` clears every
   * mark, sent while the affected toggle is off and while it is on with no result; absent: unchanged since the last message that
   * carried it and the post is not forced, so the page keeps its marks. A reloaded or new page always gets the key.
   */
  readonly affected?: GraphAffected | null;
  /**
   * Task id → ms its own live run has run, at the time the host built this message; only ids whose own run is `running` or
   * `continuous`. Absent: no clocks.
   */
  readonly elapsed?: Readonly<Record<string, number>>;
};

/** Asks the page to show these tasks in task mode. */
export type GraphShowTasksMessage = {
  readonly type: 'showTasks';
  readonly taskIds: string[];
};

/** Asks the page to focus this package on the graph. */
export type GraphShowPackageMessage = {
  readonly type: 'showPackage';
  readonly name: string;
};

/** The one request a graph panel holds until its page can take it: the latest of either kind wins. */
export type GraphShowRequest = GraphShowTasksMessage | GraphShowPackageMessage;

/** Host to webview. */
export type GraphHostMessage =
  | GraphStateMessage
  | GraphEdgeExplainedMessage
  | GraphEdgeImportsMessage
  | GraphRunsMessage
  | GraphShowTasksMessage
  | GraphShowPackageMessage
  | GraphAtomsMessage;

type GraphReadyMessage = { readonly type: 'ready' };

type GraphReloadMessage = { readonly type: 'reload' };

type GraphOpenDetailsMessage = {
  readonly type: 'openDetails';
  readonly packageName: string;
};

type GraphExplainEdgeMessage = {
  readonly type: 'explainEdge';
  readonly source: string;
  readonly target: string;
};

type GraphOpenManifestMessage = {
  readonly type: 'openManifest';
  readonly packageName: string;
  readonly line: number;
};

/** Which layout a `positions` post belongs to: the flat graph or the one grouped by folder. */
export type LayoutGrouping = 'flat' | 'folders';

/** Positions for the host's layout cache of `grouping`; keys are exactly the package names. */
export type GraphPositionsMessage = {
  readonly type: 'positions';
  readonly hash: string;
  readonly positions: Positions;
  readonly routes: Routes;
  readonly grouping: LayoutGrouping;
};

type GraphLayoutDoneMessage = {
  readonly type: 'layoutDone';
  readonly ms: number;
  readonly engine: 'elk' | 'fallback';
};

/** A PNG of the graph for the host to save: base64 characters only, no `data:` prefix. */
type GraphExportImageMessage = {
  readonly type: 'exportImage';
  readonly png: string;
};

type GraphRunTaskMessage = {
  readonly type: 'runTask';
  readonly taskId: string;
  readonly noCache: boolean;
};

type GraphStopTaskMessage = {
  readonly type: 'stopTask';
  readonly taskId: string;
};

/** The umbrellas a task layout shows; the host loads the Atomizer state of their packages. */
export type GraphShownUmbrellasMessage = {
  readonly type: 'shownUmbrellas';
  readonly ids: string[];
};

/** The packages whose tasks task mode draws; the host loads their cache predictions. Posted only in task mode with the prediction toggle on. */
export type GraphShownTaskPackagesMessage = {
  readonly type: 'shownTaskPackages';
  readonly packageNames: string[];
};

/** The tree's four View toggles: scope prefixes on package labels, `package.json` scripts beside turbo tasks, the cache prediction and the affected marks. */
export type GraphViewToggle = 'scope' | 'scripts' | 'prediction' | 'affected';

/** The page flipping one of the tree's four toggles. */
export type GraphSetViewToggleMessage = {
  readonly type: 'setViewToggle';
  readonly toggle: GraphViewToggle;
  readonly shown: boolean;
};

/** Webview to host. The webview is a trust boundary: the host validates every message. */
export type GraphWebviewMessage =
  | GraphReadyMessage
  | GraphReloadMessage
  | GraphOpenDetailsMessage
  | GraphPositionsMessage
  | GraphLayoutDoneMessage
  | GraphExplainEdgeMessage
  | GraphOpenManifestMessage
  | GraphScanImportsMessage
  | GraphOpenImportMessage
  | GraphExportImageMessage
  | GraphRunTaskMessage
  | GraphStopTaskMessage
  | GraphShownUmbrellasMessage
  | GraphShownTaskPackagesMessage
  | GraphSetViewToggleMessage;
