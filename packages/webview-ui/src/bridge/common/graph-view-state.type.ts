import type { Position } from './graph-state.type.ts';

/** A saved link: the package it leaves and the package it enters. */
export type GraphLinkRef = { readonly source: string; readonly target: string };

/** A saved trace: the package it starts at and the package it ends at. */
export type GraphTraceRef = { readonly start: string; readonly end: string };

/** What the graph page keeps in the webview state: the camera, the selection, the controls panel and the inspection for one graph hash. */
export type GraphViewState = {
  readonly hash: string;
  readonly zoom: number;
  readonly pan: Position;
  readonly selected: string | null;
  readonly controlsOpen: boolean;
  readonly search: string;
  readonly depth: number;
  readonly hidden: string[];
  readonly focus: string | null;
  readonly tags: string[];
  /** Whether the details panel is open; one state for both layouts, docked and overlay. */
  readonly detailsOpen: boolean;
  readonly link: GraphLinkRef | null;
  readonly trace: GraphTraceRef | null;
  /** The inspected folder key (`''` is the root folder); a folder inspection saves it. */
  readonly folder: string | null;
  /** Whether the page is grouped by folder; carried across a hash change. */
  readonly grouped: boolean;
  /** The collapsed folder keys; kept while the page is flat and carried across a hash change minus the folders the new hash lacks. */
  readonly collapsed: string[];
};
