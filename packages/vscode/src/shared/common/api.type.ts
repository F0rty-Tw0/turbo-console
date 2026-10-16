import type { HostMessage } from '@turbo-console/webview-ui';

import type { ScriptsToggleApi } from './scripts-toggle.type.ts';
import type { Span } from './span.type.ts';
import type { LoadRecord } from '../../roots/common/coordinator.type.ts';
import type { Runs } from '../../run/common/run.type.ts';
import type { FixedViewApi } from '../../tree/common/fixed-view.type.ts';
import type { PackagesTreeApi } from '../../tree/common/tree-node.type.ts';

/** One run as the user saw it: the click (its launch token) and when its process started, both wall-clock. */
export type RunTiming = {
  readonly taskId: string;
  readonly clickedAt: number;
  readonly processStartedAt: number | null;
};

/**
 * Mutable records owned by the session. `activate` sets `activation` (its start until the roots' stat calls are issued)
 * and `activationResume` (the stat results back until it returns); the wait between them is not its own work.
 * `treeVisible` and `runs` grow in place.
 */
export type Timings = {
  activation: Span;
  activationResume: Span;
  readonly treeVisible: Map<string, Span>;
  readonly runs: RunTiming[];
};

/** What `startTimings` gives `activate`: the activation start and the timing records it opens. */
export type TimingsStart = {
  readonly start: number;
  readonly timings: Timings;
};

/** The elapsed ticker, for the integration tests: `ticks` counts its interval ticks since activation. */
export type TickerApi = {
  readonly ticks: () => number;
};

export type PanelInfo = {
  readonly root: string;
  readonly packageName: string;
  readonly visible: boolean;
};

/**
 * The open Package Details panels, for the integration tests. `posted` holds the last 100 messages sent to the panel
 * (`[]` for none). `receive` and `whenIdle` reject for a panel that is not open; `whenIdle` waits for the panel's
 * session to start, then for its dry run.
 */
export type DetailsApi = {
  readonly panels: () => PanelInfo[];
  readonly posted: (root: string, packageName: string) => HostMessage[];
  readonly receive: (root: string, packageName: string, message: unknown) => Promise<void>;
  readonly whenIdle: (root: string, packageName: string) => Promise<void>;
};

/** What the run commands and the CodeLens read of the UI: the tree's run redraw and the scripts toggle, typed by their APIs. */
export type RunCommandsUi = {
  readonly tree: Pick<PackagesTreeApi, 'runChanged'>;
  readonly scripts: ScriptsToggleApi;
};

/**
 * What `activate` returns, for the integration tests only. Root keys are each workspace folder's `uri.fsPath` as VS
 * Code gives it. `loads` holds an empty list per root from activation on. `whenIdle` waits for a pending debounced
 * watcher change and any load it starts, then for the root's load in flight; it rejects for a key that is not a current
 * root. `treeVisible` is the Packages view's `visible`, `false` before the workspace is trusted.
 */
export type TurboConsoleApi = {
  readonly tree: PackagesTreeApi;
  readonly commands: FixedViewApi;
  readonly help: FixedViewApi;
  readonly runs: Runs;
  readonly timings: Timings;
  readonly loads: Map<string, LoadRecord[]>;
  readonly whenIdle: (root: string) => Promise<void>;
  readonly details: DetailsApi;
  readonly treeVisible: () => boolean;
  readonly ticker: TickerApi;
};
