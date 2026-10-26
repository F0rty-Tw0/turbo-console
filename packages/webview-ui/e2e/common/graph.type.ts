import type { EdgeExplainResult, GraphWebviewMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import type { GraphIconId } from '../../src/graph/common/graph-icon.type.ts';
import type { ProbeState } from '../../src/graph/common/graph-probe.type.ts';

export type WorkerStub = 'real' | 'held' | 'throwOnce' | 'error' | 'silent' | 'malformed';

export type GraphOptions = {
  readonly inlineScript?: boolean;
  /** `true` makes canvas `measureText` throw, so laying out any graph fails before it is drawn. */
  readonly isMeasureBroken?: boolean;
  /** `true` answers `codicon.ttf` only after three times the page's font wait, so the page starts without glyphs. */
  readonly isCodiconHeld?: boolean;
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

/** A task node's run outline: its width and its colour as `rgb(r, g, b)`. */
export type RunOutline = {
  readonly width: number;
  readonly colour: string;
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

/** A width in CSS pixels read just before and just after one input. */
export type WidthChange = {
  readonly before: number;
  readonly after: number;
};

type DomFocus = { readonly focus: string | null };

/** The controls panel's part of the saved view state, as the panel's own inputs show it: `focus` is the locked package's name read from the DOM. */
export type ControlsFields = Pick<GraphViewState, 'controlsOpen' | 'search' | 'depth' | 'hidden' | 'tags' | 'grouped'> & DomFocus;

/** The details panel's part of the saved view state: whether it is open and the link, trace or folder it shows. */
export type DetailsFields = Pick<GraphViewState, 'detailsOpen' | 'link' | 'trace' | 'folder'>;

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

/** Main-thread CPU ms a stepped run used, in total and in its cheapest and costliest step. */
export type CpuSteps = {
  readonly totalMs: number;
  readonly minStepMs: number;
  readonly maxStepMs: number;
};

/** The main-thread CPU budgets of a hover-flow run: its total and its slowest step, in ms. */
export type HoverBudget = {
  readonly totalMs: number;
  readonly stepMs: number;
};

type MessageTag<TType extends string> = { readonly type: TType };

export type PositionsMessage = Extract<GraphWebviewMessage, MessageTag<'positions'>>;

export type LayoutDoneMessage = Extract<GraphWebviewMessage, MessageTag<'layoutDone'>>;

export type OpenDetailsMessage = Extract<GraphWebviewMessage, MessageTag<'openDetails'>>;

export type ExplainEdgeMessage = Extract<GraphWebviewMessage, MessageTag<'explainEdge'>>;

export type OpenManifestMessage = Extract<GraphWebviewMessage, MessageTag<'openManifest'>>;

export type ExportImageMessage = Extract<GraphWebviewMessage, MessageTag<'exportImage'>>;

type ResultKind<TKind extends string> = { readonly kind: TKind };

/** The host's answer when it read the manifest and found entries. */
export type FoundExplainResult = Extract<EdgeExplainResult, ResultKind<'found'>>;

/** What a package view shows beside its name; `tags: []` means the "No tags" line. */
export type PackageFacts = {
  readonly path: string;
  readonly tags: string[];
  readonly button: string;
};

/** One line of the empty view's guide as the page shows it: its icon, what can be selected, and how (key names without backticks). */
export type GuideLine = {
  readonly icon: GraphIconId;
  readonly name: string;
  readonly text: string;
};

/** The timing fact a set of samples was read from. */
export type SampleType =
  'collapse-ms' | 'controls-built-ms' | 'details-built-ms' | 'expand-ms' | 'filter-applied-ms' | 'picking-built-ms' | 'trace-ms';

/** A node centre as `[name, x, y]`. */

export type PositionRow = readonly [string, number, number];

export type NeighbourGroup = 'Direct dependencies' | 'Direct dependents';

/** What a trace view shows; `showable` defaults to `hidden`, the names that get a Show button. */
export type TraceFacts = {
  readonly start: string;
  readonly end: string;
  readonly summary: string;
  readonly path: string[];
  readonly hidden: string[];
  readonly showable?: string[];
};

/** A toolbar group by its accessible name, and its buttons in order. */
export type ToolbarGroup = {
  readonly name: string;
  readonly buttons: string[];
};

/** Three opaque colours the page's pressed toggles are drawn in, as `rgb()` text. */
export type InputOptionColors = {
  readonly background: string;
  readonly border: string;
  readonly foreground: string;
};

/** What a base64 image's header says: whether it starts with the PNG signature, and its IHDR width and height in px. */
export type PngInfo = {
  readonly isPng: boolean;
  readonly width: number;
  readonly height: number;
};

/** The px range, both ends included, each side of an exported PNG must fall in. */
export type PngBounds = {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly maxHeight: number;
};

/** Ink pixels in the title band of a box at the top of an exported PNG: between the side margins, and within them. */
export type TitleBandInk = {
  readonly inside: number;
  readonly nearSides: number;
};

/** Two base64 PNGs of the same clip: before a press and while its button is held. */
export type PressPngs = {
  readonly before: string;
  readonly during: string;
};

/** A base64 PNG and the `rgb(...)` background its pixels' contrast is read against. */
export type ContrastInput = {
  readonly png: string;
  readonly background: string;
};

/** A base64 PNG and the `rgb(...)` colour whose ink is counted in it. */
export type ColourInkInput = {
  readonly png: string;
  readonly colour: string;
};

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
    /** `performance.now()` of each message in `__posted`, same order. */
    readonly __postedAt?: number[];
    readonly __workers?: number;
    readonly __terminated?: number;
    readonly __workerMessages?: number;
    readonly __releaseWorker?: () => void;
    readonly __holdWorker?: () => void;
    __state?: unknown;
    /** `defaultPrevented` of each `contextmenu` event, as a late listener saw it. */
    __contextMenus?: boolean[];
  }
}

/* eslint-enable @typescript-eslint/naming-convention */
