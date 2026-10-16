import type { DryRunRequest, DryRunState, TurboBinary } from '@turbo-console/core';
import type { HostMessage } from '@turbo-console/webview-ui';

import type { PanelKey } from './details.type.ts';
import type { Coordinator, Roots } from '../../roots/common/coordinator.type.ts';
import type { FileLookupPorts } from '../../run/common/picker.type.ts';
import type { Runs } from '../../run/common/run.type.ts';

/** One webview panel as the registry drives it. Listeners live as long as the panel; `dispose` is safe to repeat. */
export type PanelView = {
  readonly isVisible: () => boolean;
  readonly reveal: () => void;
  readonly send: (message: HostMessage) => PromiseLike<unknown>;
  readonly onMessage: (listener: (value: unknown) => void) => void;
  readonly onViewState: (listener: () => void) => void;
  readonly onDispose: (listener: () => void) => void;
  readonly dispose: () => void;
};

/**
 * Editor effects of the registry. `open` creates a panel with its page set and throws, with no panel left behind, when
 * the page cannot be built. `rootOf` is the workspace folder holding a file. `log`, `info` and `error` never throw.
 */
export type PanelHost = {
  readonly open: (title: string) => PanelView;
  readonly rootOf: (file: string) => string | null;
  readonly dryRun: (binary: TurboBinary, request: DryRunRequest, signal: AbortSignal) => Promise<DryRunState[]>;
  readonly execute: (command: string, arg: unknown) => Promise<void>;
  readonly info: (text: string) => void;
  readonly error: (text: string) => void;
  readonly log: (text: string) => void;
};

/** `setPanelVisible` is `RootsSession.setPanelVisible`; only a session's port closure calls it. */
export type PanelsDeps = {
  readonly roots: Roots;
  readonly runs: Runs;
  readonly host: PanelHost;
  readonly setPanelVisible: (root: string, panelId: string, visible: boolean) => void;
};

/** What the registry and the test API ask of a panel's `DetailsSession`. */
type PanelSession = {
  readonly receive: (value: unknown) => Promise<void>;
  readonly whenIdle: () => Promise<void>;
  readonly dispose: () => void;
};

/** What the registry holds of a panel while it builds one: its key, its registry id and the log of what was posted. */
export type PanelParts = {
  readonly key: PanelKey;
  readonly id: string;
  readonly posted: HostMessage[];
};

/** The lookup ports of one open from a manifest, and the coordinator whose load they awaited (`null` before any). */
export type FileLookup = {
  readonly ports: FileLookupPorts;
  readonly loaded: () => Coordinator | null;
};

/** An open still being created, with the coordinator whose load it waits for or was handed. */
export type PendingOpen = {
  readonly coordinator: Coordinator | undefined;
  readonly panel: Promise<OpenPanel | null>;
};

/** What `registerDetails` asks of the registry. */
export type PanelOpener = {
  readonly open: (key: PanelKey) => Promise<OpenPanel | null>;
  readonly openFile: (file: string | null) => Promise<OpenPanel | null>;
  readonly dispose: () => void;
};

/** An open panel. `posted` holds the last `POSTED_MAX` messages sent to it. */
export type OpenPanel = {
  readonly key: PanelKey;
  readonly view: PanelView;
  readonly session: PanelSession;
  readonly posted: HostMessage[];
};
