import type { DryRunRequest, DryRunState } from '@turbo-console/core';
import type { DryRunPhase, HostMessage, ReadyMessage, RefreshMessage, WebviewMessage } from '@turbo-console/webview-ui';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RunLookup } from '../../run/common/run.type.ts';

/** One panel per key: the package `packageName` of the root `root`. */
export type PanelKey = {
  readonly root: string;
  readonly packageName: string;
};

/**
 * Editor effects of one details panel. `post` must not throw. `dryRun` rejects on a failure and on an abort and logs
 * nothing: the session logs the failures it shows. `setPanelVisible` reports the panel's visibility to the root's
 * session (`RootsSession.setPanelVisible`); the session calls it only on a change, and once with `false` on dispose
 * when it last reported `true`.
 */
export type DetailsPorts = {
  readonly post: (message: HostMessage) => void;
  readonly dryRun: (request: DryRunRequest, signal: AbortSignal) => Promise<DryRunState[]>;
  readonly isStale: (root: string) => boolean;
  readonly execute: (command: string, arg: unknown) => Promise<void>;
  readonly setPanelVisible: (visible: boolean) => void;
  readonly info: (text: string) => void;
  readonly log: (text: string) => void;
};

/** A webview message that runs an editor command; `ready` and `refresh` the session handles itself. */
export type CommandMessage = Exclude<WebviewMessage, ReadyMessage | RefreshMessage>;

/** A panel button's editor command and the tree-row-shaped argument it takes. */
export type DetailsCommand = {
  readonly command: string;
  readonly arg: unknown;
};

/** `states` hold what turbo listed for the dry run, upstream packages' tasks included: a card takes only the state whose id is its own. */
export type DryRunResult = {
  readonly phase: DryRunPhase;
  readonly states: DryRunState[];
};

export type DetailsInput = {
  readonly root: string;
  readonly packageName: string;
  readonly state: RootState;
  readonly dryRun: DryRunResult;
  readonly runs: RunLookup;
};
