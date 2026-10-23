import type { GraphHostMessage } from '@turbo-console/webview-ui';
import type * as vscode from 'vscode';

import type { GraphLayoutCacheEntry } from './graph-cache.type.ts';
import type { GraphPorts } from './graph.type.ts';
import type { PanelKey } from '../../details/common/details.type.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import type { Disposed, Runs } from '../../run/common/run.type.ts';
import type { GraphApi } from '../../shared/common/api.type.ts';
import type { EditorPanelView } from '../../shared/common/panel-view.type.ts';

/** The part of `vscode.Memento` the layout cache uses. */
export type GraphStore = {
  readonly get: (key: string) => unknown;
  readonly update: (key: string, value: GraphLayoutCacheEntry) => PromiseLike<void>;
};

/** Editor effects of the graph registry. `open` throws, with no panel left behind, when the page cannot be built; `pickSaveUri` and `writeBytes` may reject; `log`, `info`, `showInfo` and `showError` never throw. */
export type GraphHost = {
  readonly open: (title: string) => EditorPanelView<GraphHostMessage>;
  readonly readCache: GraphPorts['readCache'];
  readonly writeCache: GraphPorts['writeCache'];
  readonly readText: GraphPorts['readText'];
  readonly openAt: GraphPorts['openAt'];
  readonly log: (text: string) => void;
  readonly info: (text: string) => void;
  readonly pickSaveUri: GraphPorts['pickSaveUri'];
  readonly writeBytes: GraphPorts['writeBytes'];
  readonly showInfo: GraphPorts['showInfo'];
  readonly showError: GraphPorts['showError'];
};

/** `setPanelVisible` is `RootsSession.setPanelVisible`; only a session's port closure calls it. */
export type GraphPanelsDeps = {
  readonly roots: Roots;
  readonly host: GraphHost;
  readonly setPanelVisible: (root: string, panelId: string, visible: boolean) => void;
  readonly openDetails: (key: PanelKey) => Promise<void>;
  readonly runs: Runs;
};

/** What the registry and the test API ask of a panel's `GraphSession`. */
type GraphPanelSession = {
  readonly receive: (value: unknown) => Promise<void>;
  readonly dispose: () => void;
};

/** An open graph panel. `posted` holds the last `POSTED_MAX` messages sent to it. */
export type OpenGraphPanel = {
  readonly root: string;
  readonly view: EditorPanelView<GraphHostMessage>;
  readonly session: GraphPanelSession;
  readonly posted: GraphHostMessage[];
};

/** What `registerGraph` asks of the registry. */
export type GraphOpener = {
  readonly open: (root: string) => OpenGraphPanel | null;
  readonly dispose: () => void;
};

/**
 * What the Show Package Graph command asks of the editor: the active file, the folder holding a file, a folder pick, an
 * info and an error message, and the output log. `info`, `error` and `log` never throw.
 */
export type RootPickPorts = {
  readonly activeFile: () => string | null;
  readonly rootOf: (file: string) => string | null;
  readonly pick: (folders: RootFolder[]) => Promise<string | undefined>;
  readonly info: (text: string) => void;
  readonly error: (text: string) => void;
  readonly log: (text: string) => void;
};

/** What `createGraph` reads of the Details registry: opening a package's panel. */
export type GraphDetails = {
  readonly open: (key: PanelKey) => Promise<unknown>;
};

/** What `createGraph` reads of the extension context. */
export type GraphContext = {
  readonly extensionUri: vscode.Uri;
  readonly workspaceState: GraphStore;
};

/** Everything `activate` takes of the graph: the test API, the prune on roots change and the command registration. */
export type GraphWiring = {
  readonly api: GraphApi;
  readonly pruneRoots: () => void;
  readonly register: () => Disposed;
};
