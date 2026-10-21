import type { GraphWebviewMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { GraphReady, Position } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeState } from '../../src/graph/common/graph-probe.type.ts';

export type WorkerStub = 'real' | 'throwOnce' | 'error' | 'silent';

export type GraphOptions = {
  readonly inlineScript?: boolean;
  readonly workers?: WorkerStub;
  /** `false` skips the VS Code host stub, so the page runs on its stub bridge. */
  readonly host?: boolean;
  /** `false` skips the probe flag, so the page exposes no probe. */
  readonly probe?: boolean;
};

export type PackageGraphState = GraphReady;

type CssVars = Readonly<Record<string, string>>;

/** Cytoscape-resolved colours as `rgb(r, g, b)`; compared with whitespace stripped. */
export type ThemeColors = {
  readonly fill: string;
  readonly label: string;
  readonly frame: string;
  readonly edge: string;
  readonly selected: string;
};

export type ThemeStub = {
  readonly bodyClass: string;
  readonly vars: CssVars;
  readonly expected: ThemeColors;
};

/** The names the in-page theme switch clears, then the variables and body class it sets. */
export type ThemeSwitch = {
  readonly names: string[];
  readonly theme: ThemeStub;
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

type MessageTag<TType extends string> = { readonly type: TType };

export type PositionsMessage = Extract<GraphWebviewMessage, MessageTag<'positions'>>;

export type LayoutDoneMessage = Extract<GraphWebviewMessage, MessageTag<'layoutDone'>>;

export type OpenDetailsMessage = Extract<GraphWebviewMessage, MessageTag<'openDetails'>>;

/** The hash and the sorted package names of a `positions` message; `hash` is `undefined` before one is posted. */
export type PostedPositions = {
  readonly hash: string | undefined;
  readonly names: string[];
};
