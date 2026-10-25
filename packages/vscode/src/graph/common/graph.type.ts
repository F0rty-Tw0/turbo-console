import type { GraphHostMessage, GraphState, GraphWebviewMessage, LayoutGrouping } from '@turbo-console/webview-ui';

import type { GraphLayoutCacheEntry } from './graph-cache.type.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';

/**
 * Editor effects of one graph panel. `openDetails` and `openAt` may reject; `readText` rejects on a file it cannot open and gives
 * `null` for one over the read cap; `pickSaveUri` gives the chosen path or `null` on a cancel and may reject, as may `writeBytes`;
 * `executeCommand` runs a registered command and may reject; `log` (failures), `info`, `showInfo` and `showError` take one clean line and must not throw.
 */
export type GraphPorts = {
  readonly post: (message: GraphHostMessage) => void;
  readonly readCache: (root: string, grouping: LayoutGrouping) => GraphLayoutCacheEntry | null;
  readonly writeCache: (root: string, grouping: LayoutGrouping, entry: GraphLayoutCacheEntry) => void;
  readonly openDetails: (packageName: string) => Promise<void>;
  readonly readText: (path: string) => Promise<string | null>;
  readonly openAt: (path: string, line: number) => Promise<void>;
  readonly setPanelVisible: (visible: boolean) => void;
  readonly log: (text: string) => void;
  readonly info: (text: string) => void;
  readonly pickSaveUri: (defaultPath: string) => Promise<string | null>;
  readonly writeBytes: (path: string, bytes: Uint8Array) => Promise<void>;
  readonly showInfo: (text: string) => void;
  readonly showError: (text: string) => void;
  readonly executeCommand: (command: string, arg: unknown) => Promise<void>;
};

type PositionsTag = { readonly type: 'positions' };

type UncheckedPositionsMessage = {
  readonly type: 'positions';
  readonly hash: string;
  readonly positions: unknown;
  readonly grouping: LayoutGrouping;
};

/** A message that passed `graphMessageSchema`: a `positions` record is still unread. */
export type SchemaGraphMessage = Exclude<GraphWebviewMessage, PositionsTag> | UncheckedPositionsMessage;

type RequestTag = { readonly type: 'reload' | 'openDetails' | 'runTask' | 'stopTask' };

/** A page request the session answers from the state it builds now: a reload, a package's details or a task run or stop. */
export type GraphRequestMessage = Extract<GraphWebviewMessage, RequestTag>;

type RunTag = { readonly type: 'runTask' | 'stopTask' };

/** A page request to run or stop one task of the graph. */
export type GraphRunRequest = Extract<GraphWebviewMessage, RunTag>;

/** What a request is judged against: the state built now, the root, its coordinator and the ports a request may use. */
export type RequestContext = {
  readonly state: GraphState;
  readonly root: string;
  readonly coordinator: Pick<Coordinator, 'request'> | undefined;
  readonly ports: Pick<GraphPorts, 'openDetails' | 'log' | 'executeCommand'>;
};

type ExplainTag = { readonly type: 'explainEdge' | 'openManifest' };

/** A page request to look into the graph: the reply to an edge or the opening of a package's manifest. */
export type ExplainRequest = Extract<GraphWebviewMessage, ExplainTag>;

/** What `answerRequest` needs of the session: the state it judges against, the workspace root, the ports and whether a reply may still be posted. */
export type ExplainContext = {
  readonly state: GraphState;
  readonly root: string;
  readonly ports: GraphPorts;
  readonly canPost: () => boolean;
};

/** `canPost` is the session's check that the panel is shown, ready and alive; `state` is the state as it is now and `runIds` the ids a run can report, without the rest of the state. */
export type TaskFeedGate = {
  readonly canPost: () => boolean;
  readonly state: () => GraphState;
  readonly runIds: () => string[];
};

/** The tree command a graph run request maps to, with the tree-row argument it takes. */
export type GraphRunCommand = {
  readonly command: string;
  readonly arg: unknown;
};
