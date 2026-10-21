import type { GraphState, Positions } from './graph-state.type.ts';

/** The `package.json` field that holds a dependency entry. */
export type ManifestField = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

/** One entry of a dependent's `package.json`: `line` is 0-based; `key` and `spec` are cut to `ENTRY_TEXT_MAX` characters plus `…`. */
export type ManifestEntry = {
  readonly field: ManifestField;
  readonly key: string;
  readonly spec: string;
  readonly line: number;
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

/** Host to webview. */
export type GraphHostMessage = GraphStateMessage | GraphEdgeExplainedMessage;

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

type GraphPositionsMessage = {
  readonly type: 'positions';
  readonly hash: string;
  readonly positions: Positions;
};

type GraphLayoutDoneMessage = {
  readonly type: 'layoutDone';
  readonly ms: number;
  readonly engine: 'elk' | 'fallback';
};

/** Webview to host. The webview is a trust boundary: the host validates every message. */
export type GraphWebviewMessage =
  | GraphReadyMessage
  | GraphReloadMessage
  | GraphOpenDetailsMessage
  | GraphPositionsMessage
  | GraphLayoutDoneMessage
  | GraphExplainEdgeMessage
  | GraphOpenManifestMessage;
