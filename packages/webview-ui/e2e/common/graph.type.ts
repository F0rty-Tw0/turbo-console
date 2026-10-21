import type { GraphWebviewMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import type { ProbeState } from '../../src/graph/common/graph-probe.type.ts';

export type WorkerStub = 'real' | 'throwOnce' | 'error' | 'silent' | 'malformed';

export type GraphOptions = {
  readonly inlineScript?: boolean;
  /** `true` makes canvas `measureText` throw, so laying out any graph fails before it is drawn. */
  readonly isMeasureBroken?: boolean;
  /** The webview state VS Code kept, as `getState` hands it to the page; any value, valid or not. */
  readonly savedState?: unknown;
  readonly workers?: WorkerStub;
  /** `false` skips the VS Code host stub, so the page runs on its stub bridge. */
  readonly host?: boolean;
  /** `false` skips the probe flag, so the page exposes no probe. */
  readonly probe?: boolean;
};

type CssVars = Readonly<Record<string, string>>;

/** Cytoscape-resolved colours as `rgb(r, g, b)`; compared with whitespace stripped. */
export type ExpectedThemeColors = {
  readonly fill: string;
  readonly label: string;
  readonly frame: string;
  readonly edge: string;
  readonly selected: string;
};

export type ThemeStub = {
  readonly bodyClass: string;
  readonly vars: CssVars;
  readonly expected: ExpectedThemeColors;
};

/** The names the in-page theme switch clears, then the variables and body class it sets. */
export type ThemeSwitch = {
  readonly names: string[];
  readonly theme: ThemeStub;
};

/** What a viewer sees of the graph: how far it is zoomed and where it is panned. */
export type Camera = Pick<GraphViewState, 'zoom' | 'pan'>;

/** A key to press, and the accessible name of the control that holds focus once it has been handled. */
export type FocusStep = {
  readonly key: string;
  readonly focus: string;
};

/** Package name to the state the probe reports for it. */
export type NodeStates = Readonly<Record<string, ProbeState>>;

/** `source>target` to the state the probe reports for that edge. */
export type EdgeStates = Readonly<Record<string, ProbeState>>;

/** A node dragged by `(dx, dy)` screen pixels at `zoom`, from model centre `from`. */
export type DragRecord = {
  readonly id: string;
  readonly from: Position;
  readonly dx: number;
  readonly dy: number;
  readonly zoom: number;
};

/** Main-thread CPU ms a scripted pan used, in total and in its costliest step. */
export type PanCpu = {
  readonly totalMs: number;
  readonly maxStepMs: number;
};

type MessageTag<TType extends string> = { readonly type: TType };

export type PositionsMessage = Extract<GraphWebviewMessage, MessageTag<'positions'>>;

export type LayoutDoneMessage = Extract<GraphWebviewMessage, MessageTag<'layoutDone'>>;

export type OpenDetailsMessage = Extract<GraphWebviewMessage, MessageTag<'openDetails'>>;

/** The hash and the sorted package names of a `positions` message; `hash` is `undefined` before one is posted. */
export type PostedPositions = {
  readonly hash: string | undefined;
  readonly names: string[];
};

/* eslint-disable @typescript-eslint/naming-convention -- the host and worker init scripts set these exact names on window */

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- only an interface merges into Window
  interface Window {
    __posted?: GraphWebviewMessage[];
    readonly __workers?: number;
    readonly __terminated?: number;
    readonly __workerMessages?: number;
    __state?: unknown;
  }
}

/* eslint-enable @typescript-eslint/naming-convention */
