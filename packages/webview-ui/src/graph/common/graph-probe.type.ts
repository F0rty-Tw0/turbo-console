import type { Inspection } from './inspection.type.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

export type ProbeState = 'selected' | 'highlighted' | 'dimmed' | 'normal';

/**
 * `x`, `y` are model centres; `renderedX`, `renderedY` the centre in page CSS pixels; colours are Cytoscape's `rgb(...)`.
 * `effectiveOpacity` is Cytoscape's `node.effectiveOpacity()`: the node's opacity times its ancestors'.
 * A ghost (a trace's hidden path package) reads `highlighted` plus `isGhost`. `isVisible` is the filter sense: the
 * package's own `display` is `element` and it is no ghost, so a package inside a collapsed folder stays visible;
 * `isCollapsed` says its folder box is collapsed.
 */
export type ProbeNode = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly renderedX: number;
  readonly renderedY: number;
  readonly width: number;
  readonly height: number;
  readonly state: ProbeState;
  readonly frame: string;
  readonly label: string;
  /** The label text drawn on the page: a package's name, a task box's package name, empty for a box with none. */
  readonly text: string;
  readonly fill: string;
  readonly isGhost: boolean;
  readonly borderStyle: string;
  readonly effectiveOpacity: number;
  readonly isVisible: boolean;
  readonly isCollapsed: boolean;
  /** A task's run outline: 0 wide with no run state. */
  readonly outlineWidth: number;
  readonly outlineColor: string;
};

export type ProbeEdge = {
  readonly source: string;
  readonly target: string;
  readonly state: ProbeState;
  readonly isGhost: boolean;
  /** Cytoscape's `visible()`: false with a hidden end or a `display: none` bypass. */
  readonly isDrawn: boolean;
  readonly lineStyle: string;
};

/**
 * A folder box: `folder` is the key (`''` the root); `state` and the rect (centre and size in page CSS pixels, as
 * `ProbeNode`'s) come from the box while expanded and from the collapsed node while collapsed, 0 when it is not drawn;
 * `packages` lists all the folder's packages by name, hidden ones included.
 */
export type ProbeFolder = {
  readonly folder: string;
  readonly isCollapsed: boolean;
  readonly isVisible: boolean;
  readonly state: ProbeState;
  readonly renderedX: number;
  readonly renderedY: number;
  readonly renderedWidth: number;
  readonly renderedHeight: number;
  readonly packages: string[];
};

/** A drawn folder link: an end reads the folder key when it is a collapsed folder, else the package name. */
export type ProbeFolderLink = {
  readonly source: string;
  readonly target: string;
  /** The package links it stands for. */
  readonly count: number;
  /** Cytoscape's `visible()`. */
  readonly isDrawn: boolean;
  readonly state: ProbeState;
};

export type LayoutEngine = 'elk' | 'cache' | 'fallback';

/** What the e2e tests read from the page; exposed only when `window.__tcGraphProbeWanted === true` before `main.js` runs. */
export type GraphProbe = {
  readonly nodes: () => ProbeNode[];
  readonly edges: () => ProbeEdge[];
  /** The first edge's `line-color`, `''` when there is no edge. */
  readonly edgeColor: () => string;
  readonly selected: () => string | null;
  readonly zoom: () => number;
  readonly pan: () => Position;
  /** The Cytoscape `render` events since the probe was made: a redraw of the canvas, which the flow overlay exists to avoid. */
  readonly renderCount: () => number;
  /** From the latest `graph` state's message event to the first Cytoscape `render` after it; `null` until that render. */
  readonly firstFrameMs: () => number | null;
  readonly layoutEngine: () => LayoutEngine | null;
  /** The package names the filters leave visible, sorted, ghosts left out: a package in a collapsed folder stays in. */
  readonly visibleIds: () => string[];
  /** Whether the page shows the packages in folder boxes. */
  readonly grouped: () => boolean;
  /** The folder boxes sorted by key (`''` first); `[]` while the graph is flat. */
  readonly folders: () => ProbeFolder[];
  /** The drawn folder links in drawing order. */
  readonly folderLinks: () => ProbeFolderLink[];
  /** From the latest collapse or expand to the first frame drawn after it; `null` until that frame. */
  readonly toggleMs: () => number | null;
  /** From the latest expand or collapse of an Atomizer group to the first frame drawn after it; `null` until that frame. */
  readonly atomToggleMs: () => number | null;
  /** From the latest `graph` state's message event to its controls panel built and restored; `null` until then. */
  readonly controlsBuiltMs: () => number | null;
  /** From the latest filter input to the return of the fit after it; `null` until an input changed the visible set. */
  readonly filterAppliedMs: () => number | null;
  /** What the page is showing details of. */
  readonly inspection: () => Inspection;
  /** From a `package` inspection being set to its details view shown; `null` until one is. */
  readonly detailsBuiltMs: () => number | null;
  /** From a `picking` inspection being set, before its candidates are found, to its view shown; `null` until one is. */
  readonly pickingBuiltMs: () => number | null;
  /** From a `trace` inspection being set, before its path is walked, to its view shown; `null` until one is. */
  readonly traceMs: () => number | null;
};

/** The probe facts only the page controller knows. */
export type ProbeFacts = Pick<
  GraphProbe,
  | 'firstFrameMs'
  | 'layoutEngine'
  | 'grouped'
  | 'selected'
  | 'controlsBuiltMs'
  | 'filterAppliedMs'
  | 'inspection'
  | 'detailsBuiltMs'
  | 'pickingBuiltMs'
  | 'traceMs'
  | 'toggleMs'
  | 'atomToggleMs'
>;

/** The probe facts the controls, the inspection and the folders know. */
export type FilteringFacts = Pick<
  ProbeFacts,
  'controlsBuiltMs' | 'filterAppliedMs' | 'selected' | 'inspection' | 'detailsBuiltMs' | 'pickingBuiltMs' | 'traceMs' | 'toggleMs'
>;

/** What the filtering's facts read off the inspection. */
export type FactsInspection = {
  readonly selected: () => string | null;
  readonly current: () => Inspection;
  readonly builtMs: (kind: Inspection['kind']) => number | null;
};

/** What the filtering's facts read off the folders. */
export type FactsFolders = {
  readonly toggleMs: () => number | null;
};

/** The filtering's own timings, read by its facts. */
export type FilteringTimes = Pick<FilteringFacts, 'controlsBuiltMs' | 'filterAppliedMs'>;

/* eslint-disable @typescript-eslint/naming-convention -- the e2e tests set and read these exact names on window */

/** Where the probe goes: `window` in the page. `__tcGraphProbe` stays mutable: it is assigned. */
export type ProbeHost = {
  __tcGraphProbe?: GraphProbe;
  readonly __tcGraphProbeWanted?: unknown;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- only an interface merges into Window
  interface Window {
    __tcGraphProbe?: GraphProbe;
    readonly __tcGraphProbeWanted?: unknown;
  }
}

/* eslint-enable @typescript-eslint/naming-convention */
