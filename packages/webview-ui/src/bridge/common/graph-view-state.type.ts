import type { Position } from './graph-state.type.ts';

/** A saved link: the package it leaves and the package it enters. */
export type GraphLinkRef = { readonly source: string; readonly target: string };

/** A saved trace: the package it starts at and the package it ends at. */
export type GraphTraceRef = { readonly start: string; readonly end: string };

type PackageFocus = { readonly kind: 'package'; readonly name: string };

type FolderFocus = { readonly kind: 'folder'; readonly folder: string };

/** What the controls narrow the graph to: one package and its neighbours (within the filters' depth), or the packages of one folder (`''` is the root folder). */
export type GraphFocus = PackageFocus | FolderFocus;

/** Which graph the page draws: the package graph or the task graph. */
export type GraphViewMode = 'packages' | 'tasks';

/** What task mode keeps: the chosen task ids, whether the cap is lifted, the Dependents depth, the selection, the search, the camera and the key of its last layout. */
export type TaskViewState = {
  readonly chosen: string[];
  readonly capLifted: boolean;
  readonly depth: number;
  readonly selected: string | null;
  readonly search: string;
  readonly zoom: number;
  readonly pan: Position;
  readonly layoutKey: string;
};

/** The drawn widths in px of the Controls and Details panels. */
export type PanelWidths = { readonly controls: number; readonly details: number };

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
  readonly focus: GraphFocus | null;
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
  /** Which graph the page draws; an old save reads `'packages'`. */
  readonly mode: GraphViewMode;
  /** The last task view; kept across package saves and hash changes, `null` until task mode saves one. */
  readonly task: TaskViewState | null;
  /** The panel widths the user dragged to, once per page; `null` until a drag saves them. */
  readonly panelWidths: PanelWidths | null;
};

/** The view state the package graph saves: everything but the mode, the task view and the panel widths, which `ViewStateModes` adds. */
export type PackageViewState = Omit<GraphViewState, 'mode' | 'task' | 'panelWidths'>;
