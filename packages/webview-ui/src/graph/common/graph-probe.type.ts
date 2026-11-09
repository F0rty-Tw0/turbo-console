import type { ProbeRect, ProbeTitle } from './graph-probe-titles.type.ts';
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
  /** The resolved `text-max-width` in px: how wide the label may draw before its ellipsis. */
  readonly textMaxWidth: number;
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
 * One drawn edge's line (a package edge or a task link) in page CSS pixels, the frame of `ProbeNode.renderedX`: `points` run from the source end
 * through the bends (a routed edge's segment points, else its control points) to the target end, `[]` while the edge
 * is not drawn; `midpoint` lies on that path (the origin while the edge is not drawn).
 */
export type ProbeEdgeLine = {
  readonly source: string;
  readonly target: string;
  readonly isRouted: boolean;
  readonly isDrawn: boolean;
  readonly points: Position[];
  readonly midpoint: Position;
};

/** An edge end, read for its id. */
export type ProbeLineEnd = {
  readonly id: () => string;
};

/** What `ProbeEdgeLine` reads of a Cytoscape edge; `segmentPoints` is `undefined` unless the edge is drawn `round-segments`. */
export type ProbeLineSource = {
  readonly source: () => ProbeLineEnd;
  readonly target: () => ProbeLineEnd;
  readonly visible: () => boolean;
  readonly hasClass: (name: string) => boolean;
  readonly sourceEndpoint: () => Position;
  readonly targetEndpoint: () => Position;
  readonly segmentPoints: () => Position[] | undefined;
  readonly controlPoints: () => Position[] | undefined;
  readonly midpoint: () => Position;
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
  /** The model width in px of the box or collapsed node shown, padding left out as in a probe node's `width`; 0 while not drawn. */
  readonly width: number;
  /** The label drawn on the canvas: `''` on a box and on a collapsed node showing its header row. */
  readonly text: string;
  /** The resolved `text-max-width` in px of the box or collapsed node shown: how wide its label may draw before its ellipsis. */
  readonly textMaxWidth: number;
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
  /** The `<n> links` label's box, background included; width and height 0 while the link is not drawn (left and top then equal the container origin). */
  readonly labelBox: ProbeRect;
};

export type LayoutEngine = 'elk' | 'cache' | 'fallback';

/** What the e2e tests read from the page; exposed only when `window.__tcGraphProbeWanted === true` before `main.js` runs. */
export type GraphProbe = {
  readonly nodes: () => ProbeNode[];
  readonly edges: () => ProbeEdge[];
  /** Every drawn edge's line (package or task link), in the order `edges` lists them. */
  readonly edgeLines: () => ProbeEdgeLine[];
  /** Every folder link's line, in the order `folderLinks` lists them. */
  readonly folderLinkLines: () => ProbeEdgeLine[];
  /** The first edge's `line-color`, `''` when there is no edge. */
  readonly edgeColor: () => string;
  /**
   * The selected task id (`app#build`) while task mode is on, else the selected package name; `null` when nothing is.
   * In task mode it is the saved task id as soon as the mode is on, before the task layout lands, while the package
   * graph may still be drawn.
   */
  readonly selected: () => string | null;
  readonly zoom: () => number;
  readonly pan: () => Position;
  /** The Cytoscape `render` events since the probe was made: a redraw of the canvas, which the flow overlay exists to avoid. */
  readonly renderCount: () => number;
  /** Redraws the canvas at once (Cytoscape's `forceRender`), which counts as a `render`: lets a test finish a texture rebuild before it counts renders. */
  readonly forceRender: () => void;
  /**
   * Turns off Cytoscape's layered texture cache, then redraws: every later frame draws each element from its own
   * texture cache, as a press frame does, so two shots compare the same drawing path. Throws when the renderer has no
   * such cache.
   */
  readonly drawWithoutLayers: () => void;
  /**
   * The sorted ids of the nodes whose edges Cytoscape still marks dirty, so every read of those edges' endpoints (the
   * flow overlay reads them each frame) recomputes their projections; `[]` once its rendered style queue is flushed.
   */
  readonly dirtyEdgeEndIds: () => string[];
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
  /** Every task mode package box with its title; `[]` outside task mode. */
  readonly boxTitles: () => ProbeTitle[];
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
  readonly __tcLayoutTimeoutMs?: unknown;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- only an interface merges into Window
  interface Window {
    __tcGraphProbe?: GraphProbe;
    readonly __tcGraphProbeWanted?: unknown;
    readonly __tcLayoutTimeoutMs?: unknown;
  }
}

/* eslint-enable @typescript-eslint/naming-convention */
