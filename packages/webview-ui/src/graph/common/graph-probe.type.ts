import type { Inspection } from './inspection.type.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

export type ProbeState = 'selected' | 'highlighted' | 'dimmed' | 'normal';

/** `x`, `y` are model centres; `renderedX`, `renderedY` the centre in page CSS pixels; colours are Cytoscape's `rgb(...)`. */
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
  readonly fill: string;
};

export type ProbeEdge = {
  readonly source: string;
  readonly target: string;
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
  /** From the latest `graph` state's message event to the first Cytoscape `render` after it; `null` until that render. */
  readonly firstFrameMs: () => number | null;
  readonly layoutEngine: () => LayoutEngine | null;
  /** The package names Cytoscape draws, sorted: nodes a filter hides are `display: none`. */
  readonly visibleIds: () => string[];
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
  | 'selected'
  | 'controlsBuiltMs'
  | 'filterAppliedMs'
  | 'inspection'
  | 'detailsBuiltMs'
  | 'pickingBuiltMs'
  | 'traceMs'
>;

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
