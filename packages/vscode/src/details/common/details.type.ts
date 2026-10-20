import type { DryRunRequest, DryRunState, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { DryRunPhase, HostMessage, ReadyMessage, RefreshMessage, WebviewMessage } from '@turbo-console/webview-ui';

import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunLookup, Runs } from '../../run/common/run.type.ts';

/** One panel per key: the package `packageName` of the root `root`. */
export type PanelKey = {
  readonly root: string;
  readonly packageName: string;
};

/**
 * Editor effects of one details panel. `post` must not throw. `dryRun` rejects on a failure and on an abort and logs
 * nothing: the session logs the failures it shows. `setPanelVisible` reports the panel's visibility to the root's
 * session (`RootsSession.setPanelVisible`); the session calls it only on a change, and once with `false` on dispose
 * when it last reported `true`. `setTitle` sets the tab title. `scriptsShown` is the scripts toggle's value now. `now` is the wall clock, the base of
 * every run's `launchedAt`.
 */
export type DetailsPorts = {
  readonly post: (message: HostMessage) => void;
  readonly dryRun: (request: DryRunRequest, signal: AbortSignal) => Promise<DryRunState[]>;
  readonly isStale: (root: string) => boolean;
  readonly execute: (command: string, arg: unknown) => Promise<void>;
  readonly setPanelVisible: (visible: boolean) => void;
  readonly setTitle: (title: string) => void;
  readonly info: (text: string) => void;
  readonly log: (text: string) => void;
  readonly scriptsShown: () => boolean;
  readonly now: () => number;
};

/** The task ids of a panel's cards. */
export type CardTaskIds = {
  readonly all: ReadonlySet<string>;
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
  readonly scriptsShown: boolean;
  readonly lastLabel: string | null;
  readonly now: number;
};

/** What a card is built from besides its task: the input, the dependents and dry-run states by task id, and the root's model. */
export type CardSources = {
  readonly input: DetailsInput;
  readonly dependents: ReadonlyMap<string, string[]>;
  readonly dryRunStates: ReadonlyMap<string, DryRunState>;
  readonly model: WorkspaceModel;
};

/** The tasks that get a card, in name order, and how many runnable scripts the toggle left out (refused names are not counted). */
export type CardTasks = {
  readonly shown: TaskNode[];
  readonly hiddenScriptCount: number;
};

/** What the poster asks of its session: whether `start` has run, and whether a message may go out now (shown, page ready). */
export type PosterGate = {
  readonly isStarted: () => boolean;
  readonly canPost: () => boolean;
};

/** What `DetailsStatePoster` builds and posts the panel's states from; `dryRun` is the panel's dry-run result now. */
export type PosterDeps = {
  readonly key: PanelKey;
  readonly roots: Roots;
  readonly runs: Runs;
  readonly ports: DetailsPorts;
  readonly gate: PosterGate;
  readonly dryRun: () => DryRunResult;
  readonly lastLabel: () => string | null;
};
